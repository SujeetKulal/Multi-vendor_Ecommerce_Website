from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser
from apps.products.models import Product, ProductReview
from apps.products.serializers import BulkStockUpdateSerializer, ProductReviewSerializer, ProductSerializer
from apps.vendors.permissions import IsApprovedVendor


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related("vendor", "vendor__user").all()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "mine", "low_stock", "bulk_stock_update"):
            return [permissions.IsAuthenticated(), IsApprovedVendor()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()

        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")

        if category:
            queryset = queryset.filter(category__iexact=category)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))

        if self.action == "mine" and self.request.user.role == CustomUser.Role.VENDOR:
            queryset = queryset.filter(vendor=self.request.user.vendor_profile)
        return queryset

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor_profile)

    def perform_update(self, serializer):
        self._assert_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_owner(instance)
        instance.delete()

    def _assert_owner(self, product: Product):
        if product.vendor_id != self.request.user.vendor_profile.id:
            raise PermissionDenied("You can only manage your own products.")

    @action(detail=False, methods=["get"])
    def mine(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        threshold = int(request.query_params.get("threshold", 5))
        queryset = (
            Product.objects.select_related("vendor")
            .filter(vendor=request.user.vendor_profile, stock__lte=threshold)
            .order_by("stock", "-updated_at")
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["patch"])
    def bulk_stock_update(self, request):
        serializer = BulkStockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mode = serializer.validated_data["mode"]
        items = serializer.validated_data["items"]
        product_ids = [item["product_id"] for item in items]
        products = Product.objects.filter(vendor=request.user.vendor_profile, id__in=product_ids)
        product_map = {p.id: p for p in products}

        updated = 0
        for item in items:
            product = product_map.get(item["product_id"])
            if not product:
                continue
            qty = item["quantity"]
            product.stock = qty if mode == "set" else product.stock + qty
            product.save(update_fields=["stock", "updated_at"])
            updated += 1

        return Response({"updated_count": updated, "mode": mode})


class CategoryListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        predefined = [choice[0] for choice in Product.Category.choices]
        custom = list(Product.objects.values_list("category", flat=True).distinct().order_by("category"))
        categories = sorted(set(predefined + custom))
        return Response({"categories": list(categories)})


class ProductReviewListCreateAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_product(self, product_id):
        return get_object_or_404(Product, pk=product_id)

    def get(self, request, product_id):
        product = self.get_product(product_id)
        queryset = ProductReview.objects.filter(product=product).select_related("customer").prefetch_related("images")
        serializer = ProductReviewSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, product_id):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=401)
        product = self.get_product(product_id)
        serializer = ProductReviewSerializer(data=request.data, context={"request": request, "product": product})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(ProductReviewSerializer(review).data, status=201)
