from datetime import date, timedelta

from django.db import transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncDate
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser, ShippingProfile
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import (
    AdminOrderStatusSerializer,
    CheckoutSerializer,
    OrderItemSerializer,
    OrderSerializer,
    VendorOrderItemStatusSerializer,
    validate_and_lock_products,
)
from apps.vendors.permissions import IsAdminRole, IsVendorRole


def calculate_vendor_total_sales(vendor):
    shipped_or_delivered = [OrderItem.Status.SHIPPED, OrderItem.Status.DELIVERED]
    line_total = ExpressionWrapper(F("price") * F("quantity"), output_field=DecimalField(max_digits=12, decimal_places=2))
    return (
        OrderItem.objects.filter(vendor=vendor, status__in=shipped_or_delivered).aggregate(total=Sum(line_total))["total"]
        or 0
    )


def calculate_order_status_from_items(order):
    statuses = set(order.items.values_list("status", flat=True))
    if not statuses:
        return Order.Status.PENDING
    if statuses == {OrderItem.Status.DELIVERED}:
        return Order.Status.COMPLETED
    if OrderItem.Status.PROCESSING in statuses:
        if OrderItem.Status.SHIPPED in statuses or OrderItem.Status.DELIVERED in statuses:
            return Order.Status.PARTIALLY_SHIPPED
        return Order.Status.PROCESSING
    return Order.Status.SHIPPED


def sync_order_status(order):
    new_status = calculate_order_status_from_items(order)
    if order.status != new_status:
        order.status = new_status
        order.save(update_fields=["status"])


class CheckoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != CustomUser.Role.CUSTOMER:
            return Response({"detail": "Only customers can checkout."}, status=status.HTTP_403_FORBIDDEN)

        profile, _ = ShippingProfile.objects.get_or_create(user=request.user)
        required_profile_fields = {
            "phone": profile.phone,
            "address_line1": profile.address_line1,
            "city": profile.city,
            "state": profile.state,
            "postal_code": profile.postal_code,
            "country": profile.country,
        }
        missing_fields = [field for field, value in required_profile_fields.items() if not (value or "").strip()]
        if missing_fields:
            return Response(
                {
                    "detail": "Please complete your profile with contact number and shipping address before checkout.",
                    "code": "profile_incomplete",
                    "missing_fields": missing_fields,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items = serializer.validated_data["items"]

        with transaction.atomic():
            product_map, total = validate_and_lock_products(items)
            order = Order.objects.create(customer=request.user, total_price=total, status=Order.Status.PROCESSING)

            order_items = []
            for data in product_map.values():
                product = data["product"]
                quantity = data["quantity"]
                unit_price = data["unit_price"]
                order_items.append(
                    OrderItem(
                        order=order,
                        product=product,
                        vendor=product.vendor,
                        quantity=quantity,
                        price=unit_price,
                        status=OrderItem.Status.PROCESSING,
                    )
                )
                product.stock -= quantity
                product.save(update_fields=["stock"])

            OrderItem.objects.bulk_create(order_items)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class CustomerOrderListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .select_related("customer", "customer__shipping_profile")
            .prefetch_related("items__product", "items__vendor")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Keep historical orders in sync even if they became stale earlier.
        for order in queryset:
            sync_order_status(order)
        return super().list(request, *args, **kwargs)


class VendorOrderItemListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsVendorRole]
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        return (
            OrderItem.objects.select_related("order", "order__customer", "order__customer__shipping_profile", "product", "vendor")
            .filter(vendor=self.request.user.vendor_profile)
            .order_by("-id")
        )


class VendorOrderItemStatusAPIView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsVendorRole]
    serializer_class = VendorOrderItemStatusSerializer
    queryset = OrderItem.objects.select_related("vendor", "order")

    def get_object(self):
        obj = super().get_object()
        if obj.vendor_id != self.request.user.vendor_profile.id:
            raise PermissionDenied("You can only update your own order items.")
        return obj

    def perform_update(self, serializer):
        order_item = serializer.save()
        order = order_item.order
        sync_order_status(order)

        # Keep vendor earnings synchronized with shipped/delivered item totals.
        vendor = order_item.vendor
        vendor.earnings = calculate_vendor_total_sales(vendor)
        vendor.save(update_fields=["earnings"])


class VendorFinancialsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor = request.user.vendor_profile
        total_sales = calculate_vendor_total_sales(vendor)
        vendor.earnings = total_sales
        vendor.save(update_fields=["earnings"])
        return Response({"vendor_id": vendor.id, "store_name": vendor.store_name, "total_sales": total_sales, "earnings": vendor.earnings})


class VendorEarningsAnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor = request.user.vendor_profile
        end_raw = request.query_params.get("end_date")
        start_raw = request.query_params.get("start_date")

        try:
            end_date = date.fromisoformat(end_raw) if end_raw else date.today()
            start_date = date.fromisoformat(start_raw) if start_raw else end_date - timedelta(days=29)
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        if start_date > end_date:
            return Response({"detail": "start_date cannot be after end_date."}, status=400)

        line_total = ExpressionWrapper(F("price") * F("quantity"), output_field=DecimalField(max_digits=12, decimal_places=2))
        base_qs = OrderItem.objects.filter(
            vendor=vendor,
            status__in=[OrderItem.Status.SHIPPED, OrderItem.Status.DELIVERED],
            order__created_at__date__gte=start_date,
            order__created_at__date__lte=end_date,
        )

        summary = base_qs.aggregate(
            total_sales=Sum(line_total),
            total_items=Sum("quantity"),
            total_orders=Count("order", distinct=True),
        )
        total_sales = float(summary["total_sales"] or 0)
        total_items = int(summary["total_items"] or 0)
        total_orders = int(summary["total_orders"] or 0)
        avg_order_value = (total_sales / total_orders) if total_orders else 0

        grouped = (
            base_qs.annotate(day=TruncDate("order__created_at"))
            .values("day")
            .annotate(
                sales=Sum(line_total),
                items=Sum("quantity"),
                orders=Count("order", distinct=True),
            )
            .order_by("day")
        )
        series = [
            {
                "date": g["day"].isoformat(),
                "sales": float(g["sales"] or 0),
                "items": int(g["items"] or 0),
                "orders": int(g["orders"] or 0),
            }
            for g in grouped
        ]

        return Response(
            {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "summary": {
                    "total_sales": total_sales,
                    "total_items": total_items,
                    "total_orders": total_orders,
                    "avg_order_value": avg_order_value,
                },
                "series": series,
            }
        )


class AdminOrderListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = OrderSerializer
    queryset = (
        Order.objects.select_related("customer", "customer__shipping_profile")
        .prefetch_related("items__product", "items__vendor")
        .order_by("-created_at")
    )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        for order in queryset:
            sync_order_status(order)
        return super().list(request, *args, **kwargs)


class AdminOrderStatusAPIView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = AdminOrderStatusSerializer
    queryset = Order.objects.all()
