from django.urls import path

from apps.analytics.views import AdminMetricsAPIView


urlpatterns = [
    path("admin-metrics/", AdminMetricsAPIView.as_view(), name="admin-metrics"),
]
