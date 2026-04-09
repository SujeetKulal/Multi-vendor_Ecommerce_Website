from rest_framework import serializers

from apps.vendors.models import VendorProfile


class VendorProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = VendorProfile
        fields = ("id", "email", "store_name", "is_approved", "earnings")
        read_only_fields = ("id", "earnings")
