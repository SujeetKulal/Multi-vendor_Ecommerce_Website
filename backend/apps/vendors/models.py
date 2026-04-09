from django.conf import settings
from django.db import models


class VendorProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vendor_profile")
    store_name = models.CharField(max_length=120)
    is_approved = models.BooleanField(default=False)
    earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self) -> str:
        return f"{self.store_name} ({'approved' if self.is_approved else 'pending'})"
