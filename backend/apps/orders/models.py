from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.products.models import Product
from apps.vendors.models import VendorProfile


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED", "Partially Shipped"
        SHIPPED = "SHIPPED", "Shipped"
        COMPLETED = "COMPLETED", "Completed"

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    @property
    def public_order_number(self) -> str:
        base = 1_000_000_000
        span = 9_000_000_000
        value = base + ((self.id * 2_654_435_761 + 1_013_904_223) % span)
        return str(value)

    def __str__(self) -> str:
        return f"Order #{self.public_order_number}"


class OrderItem(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "PROCESSING", "Processing"
        SHIPPED = "SHIPPED", "Shipped"
        DELIVERED = "DELIVERED", "Delivered"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    vendor = models.ForeignKey(VendorProfile, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROCESSING)

    class Meta:
        ordering = ("-id",)

    def line_total(self) -> Decimal:
        return self.price * self.quantity

    def __str__(self) -> str:
        return f"Item #{self.id} (Order #{self.order_id})"
