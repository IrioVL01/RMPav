from django.contrib import admin
from django.urls import path
# Importe as 3 views aqui:
from core.views import CalcularTrafegoView, CalcularDimensionamentoView, GerarPDFView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/calcular-trafego/', CalcularTrafegoView.as_view()),
    path('api/calcular-dimensionamento/',
         CalcularDimensionamentoView.as_view()),
    path('api/gerar-pdf/', GerarPDFView.as_view()),
]
