from django.contrib import admin

from apps.products.models import Product, ProductReview, ProductReviewImage


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "vendor", "price", "sale_price", "stock", "category")
    search_fields = ("name", "vendor__store_name", "category")
    list_filter = ("category",)


class ProductReviewImageInline(admin.TabularInline):
    model = ProductReviewImage
    extra = 0


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "customer", "rating", "created_at")
    search_fields = ("product__name", "customer__email")
    list_filter = ("rating",)
    inlines = [ProductReviewImageInline]
