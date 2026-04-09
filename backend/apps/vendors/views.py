from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.vendors.models import VendorProfile
from apps.vendors.permissions import IsAdminRole, IsVendorRole
from apps.vendors.serializers import VendorProfileSerializer


class VendorProfileMeAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsVendorRole]
    serializer_class = VendorProfileSerializer

    def get_object(self):
        profile, _ = VendorProfile.objects.get_or_create(
            user=self.request.user,
            defaults={"store_name": self.request.user.email.split("@")[0]},
        )
        return profile


class VendorListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = VendorProfileSerializer
    queryset = VendorProfile.objects.select_related("user").all().order_by("-id")


class VendorApprovalAPIView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = VendorProfileSerializer
    queryset = VendorProfile.objects.select_related("user").all()

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)
