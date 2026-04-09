from django.db import models
from django.conf import settings
from django.db.models import Avg, Count

from apps.vendors.models import VendorProfile


class Product(models.Model):
    class Category(models.TextChoices):
        FASHION = "FASHION", "Fashion"
        ELECTRONICS = "ELECTRONICS", "Electronics"
        GROCERY = "GROCERY", "Grocery"
        HEALTH = "HEALTH", "Health"
        BEAUTY = "BEAUTY", "Beauty"
        HOME = "HOME", "Home"
        SPORTS = "SPORTS", "Sports"
        BOOKS = "BOOKS", "Books"
        TOYS = "TOYS", "Toys"
        AUTOMOTIVE = "AUTOMOTIVE", "Automotive"
        OTHER = "OTHER", "Other"

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=150)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=80, db_index=True, choices=Category.choices, default=Category.OTHER)
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.name} - {self.vendor.store_name}"

    @property
    def effective_price(self):
        if self.sale_price is not None and self.sale_price > 0 and self.sale_price < self.price:
            return self.sale_price
        return self.price

    def rating_stats(self):
        agg = self.reviews.aggregate(avg=Avg("rating"), count=Count("id"))
        return {"average_rating": agg["avg"] or 0, "rating_count": agg["count"] or 0}


class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_reviews")
    rating = models.PositiveSmallIntegerField()
    review_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        unique_together = ("product", "customer")

    def __str__(self) -> str:
        return f"Review {self.id} - {self.product.name}"


class ProductReviewImage(models.Model):
    review = models.ForeignKey(ProductReview, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="reviews/")

    def __str__(self) -> str:
        return f"ReviewImage {self.id} for Review {self.review_id}"
