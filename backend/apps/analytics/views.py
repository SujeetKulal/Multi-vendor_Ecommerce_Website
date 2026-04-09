from django.db.models import Count, Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser
from apps.orders.models import Order
from apps.vendors.models import VendorProfile
from apps.vendors.permissions import IsAdminRole


class AdminMetricsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        data = {
            "total_revenue": Order.objects.aggregate(total=Sum("total_price"))["total"] or 0,
            "total_orders": Order.objects.aggregate(total=Count("id"))["total"] or 0,
            "total_users": CustomUser.objects.aggregate(total=Count("id"))["total"] or 0,
            "active_vendors": VendorProfile.objects.filter(is_approved=True).count(),
        }
        return Response(data)
