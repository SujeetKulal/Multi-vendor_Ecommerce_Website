from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.common.utils import normalize_public_url
from apps.orders.models import OrderItem
from apps.products.models import Product, ProductReview, ProductReviewImage


class ProductSerializer(serializers.ModelSerializer):
    vendor_id = serializers.IntegerField(source="vendor.id", read_only=True)
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)
    effective_price = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "vendor_id",
            "vendor_name",
            "name",
            "description",
            "price",
            "sale_price",
            "effective_price",
            "category",
            "stock",
            "image",
            "average_rating",
            "rating_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "vendor_id", "vendor_name", "created_at", "updated_at")

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        sale_price = attrs.get("sale_price", getattr(self.instance, "sale_price", None))
        if sale_price is not None and price is not None and sale_price >= price:
            raise serializers.ValidationError({"sale_price": "Sale price must be less than regular price."})
        return attrs

    def get_effective_price(self, obj):
        return obj.effective_price

    def get_average_rating(self, obj):
        return obj.rating_stats()["average_rating"]

    def get_rating_count(self, obj):
        return obj.rating_stats()["rating_count"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["image"] = normalize_public_url(data.get("image"))
        return data


class ProductReviewImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductReviewImage
        fields = ("id", "image")
        read_only_fields = ("id",)

    def get_image(self, obj):
        image = getattr(obj, "image", None)
        if not image:
            return None
        try:
            return normalize_public_url(image.url)
        except Exception:
            return None


class ProductReviewSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    images = ProductReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductReview
        fields = ("id", "product", "customer", "customer_email", "rating", "review_text", "images", "created_at")
        read_only_fields = ("id", "product", "customer", "customer_email", "created_at")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        product = self.context["product"]

        if request.user.role != CustomUser.Role.CUSTOMER:
            raise serializers.ValidationError("Only customers can submit reviews.")

        delivered_item_exists = OrderItem.objects.filter(
            order__customer=request.user,
            product=product,
            status=OrderItem.Status.DELIVERED,
        ).exists()
        if not delivered_item_exists:
            raise serializers.ValidationError("You can review only delivered products you purchased.")

        # Enforce one review per customer per product.
        if self.instance is None and ProductReview.objects.filter(product=product, customer=request.user).exists():
            raise serializers.ValidationError("You have already reviewed this product.")

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        product = self.context["product"]
        review = ProductReview.objects.create(product=product, customer=request.user, **validated_data)
        for image in request.FILES.getlist("images"):
            ProductReviewImage.objects.create(review=review, image=image)
        return review


class BulkStockItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=0)


class BulkStockUpdateSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=("set", "increment"), default="set")
    items = BulkStockItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value
