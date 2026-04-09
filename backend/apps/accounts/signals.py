from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import CustomUser
from apps.vendors.models import VendorProfile


@receiver(post_save, sender=CustomUser)
def create_vendor_profile(sender, instance: CustomUser, created: bool, **kwargs):
    if created and instance.role == CustomUser.Role.VENDOR:
        VendorProfile.objects.create(user=instance, store_name=instance.email.split("@")[0])
