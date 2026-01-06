from django.contrib import admin
from django.urls import path
from core.views import (
    CalcularTrafegoView,
    CalcularDimensionamentoView,
    Calcular13PassosView,
    GerarPDFView,
    GerarPDFTrafegoView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/calcular-trafego/', CalcularTrafegoView.as_view()),
    path('api/calcular-dimensionamento/',
         CalcularDimensionamentoView.as_view()),
    path('api/calcular-13-passos/', Calcular13PassosView.as_view()),
    path('api/gerar-pdf/', GerarPDFView.as_view()),
    path('api/gerar-pdf-trafego/', GerarPDFTrafegoView.as_view()),
]
