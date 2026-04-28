from decimal import Decimal

from rest_framework import serializers

from apps.common.utils import normalize_public_url
from apps.orders.models import Order, OrderItem
from apps.products.models import Product


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CheckoutSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    order = serializers.IntegerField(source="order.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)
    order_created_at = serializers.DateTimeField(source="order.created_at", read_only=True)
    line_total = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source="order.customer.email", read_only=True)
    customer_name = serializers.SerializerMethodField()
    shipping_phone = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "order",
            "product",
            "product_name",
            "product_image",
            "vendor",
            "vendor_name",
            "order_created_at",
            "quantity",
            "price",
            "status",
            "line_total",
            "customer_email",
            "customer_name",
            "shipping_phone",
            "shipping_address",
        )

    def get_line_total(self, obj):
        return obj.line_total()

    def get_product_image(self, obj):
        image = getattr(obj.product, "image", None)
        if not image:
            return None
        try:
            return normalize_public_url(image.url)
        except Exception:
            return None

    def get_customer_name(self, obj):
        first = (obj.order.customer.first_name or "").strip()
        last = (obj.order.customer.last_name or "").strip()
        full = f"{first} {last}".strip()
        return full or "-"

    def _shipping_profile(self, obj):
        return getattr(obj.order.customer, "shipping_profile", None)

    def get_shipping_phone(self, obj):
        profile = self._shipping_profile(obj)
        return profile.phone if profile and profile.phone else "-"

    def get_shipping_address(self, obj):
        profile = self._shipping_profile(obj)
        if not profile:
            return "-"
        parts = [
            profile.address_line1,
            profile.address_line2,
            profile.landmark,
            profile.city,
            profile.state,
            profile.postal_code,
            profile.country,
        ]
        cleaned = [p.strip() for p in parts if p and p.strip()]
        return ", ".join(cleaned) if cleaned else "-"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    order_number = serializers.SerializerMethodField()
    shipping_phone = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "customer",
            "customer_email",
            "customer_name",
            "shipping_phone",
            "shipping_address",
            "total_price",
            "status",
            "created_at",
            "items",
        )
        read_only_fields = fields

    def get_order_number(self, obj):
        return obj.public_order_number

    def get_customer_name(self, obj):
        first = (obj.customer.first_name or "").strip()
        last = (obj.customer.last_name or "").strip()
        full = f"{first} {last}".strip()
        return full or "-"

    def _shipping_profile(self, obj):
        return getattr(obj.customer, "shipping_profile", None)

    def get_shipping_phone(self, obj):
        profile = self._shipping_profile(obj)
        return profile.phone if profile and profile.phone else "-"

    def get_shipping_address(self, obj):
        profile = self._shipping_profile(obj)
        if not profile:
            return "-"
        parts = [
            profile.address_line1,
            profile.address_line2,
            profile.landmark,
            profile.city,
            profile.state,
            profile.postal_code,
            profile.country,
        ]
        cleaned = [p.strip() for p in parts if p and p.strip()]
        return ", ".join(cleaned) if cleaned else "-"


class VendorOrderItemStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ("status",)


class AdminOrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ("status",)


def validate_and_lock_products(items):
    product_map = {}
    for item in items:
        product_id = item["product_id"]
        if product_id in product_map:
            product_map[product_id]["quantity"] += item["quantity"]
            continue
        product_map[product_id] = {"quantity": item["quantity"]}

    products = Product.objects.select_for_update().select_related("vendor").filter(id__in=product_map.keys())
    if products.count() != len(product_map):
        raise serializers.ValidationError("One or more products are invalid.")

    total = Decimal("0.00")
    for product in products:
        req_qty = product_map[product.id]["quantity"]
        if product.stock < req_qty:
            raise serializers.ValidationError(f"Insufficient stock for {product.name}.")
        product_map[product.id]["product"] = product
        unit_price = product.effective_price
        product_map[product.id]["unit_price"] = unit_price
        total += unit_price * req_qty
    return product_map, total
