import os
from django.template import engines  # <--- MUDANÇA IMPORTANTE AQUI
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from xhtml2pdf import pisa

from .serializers import CalculoTrafegoInputSerializer, DimensionamentoInputSerializer
from .utils import calcular_n_total, calcular_espessura_usace


class CalcularTrafegoView(APIView):
    def post(self, request):
        serializer = CalculoTrafegoInputSerializer(data=request.data)
        if serializer.is_valid():
            return Response(calcular_n_total(
                anos=serializer.validated_data['anos'],
                taxa_crescimento=serializer.validated_data['taxa_crescimento'],
                fator_faixa=serializer.validated_data['fator_faixa'],
                lista_veiculos=serializer.validated_data['veiculos']
            ), status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CalcularDimensionamentoView(APIView):
    def post(self, request):
        serializer = DimensionamentoInputSerializer(data=request.data)
        if serializer.is_valid():
            return Response(calcular_espessura_usace(
                cbr=serializer.validated_data['cbr_subleito'],
                vdm=serializer.validated_data['vdm_medio'],
                clima=serializer.validated_data['clima'],
                anos=serializer.validated_data['anos_projeto']
            ), status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GerarPDFView(APIView):
    def post(self, request):
        dados = request.data

        # 1. Extração Segura dos Dados
        res_trafego = dados.get('resultado_trafego') or {}
        res_dim = dados.get('resultado_dim') or {}

        # 2. Mapeando os novos campos do MGLIT
        context_dict = {
            # Dados Gerais
            'anos': str(dados.get('anos', '-')),
            'taxa': str(dados.get('taxa', '-')),
            'fator_faixa': str(dados.get('fator_faixa', '-')),

            # Novos Dados de Tráfego (AASHTO vs USACE)
            'n_total_aashto': str(res_trafego.get('n_total_aashto', '-')),
            'n_total_usace': str(res_trafego.get('n_total_usace', '-')),
            # O maior dos dois
            'n_final': str(res_trafego.get('n_final_projeto', '-')),
            'metodo_escolhido': str(res_trafego.get('metodo_escolhido', '-')),

            # Lista de veículos e Progressão
            'detalhes_trafego': res_trafego.get('detalhes', []),
            # Nova tabela ano a ano
            'progressao': res_trafego.get('progressao', []),

            # Dimensionamento
            'cbr': str(dados.get('cbr', '-')),
            'clima': str(dados.get('clima', '-')),
            'vdm_medio': str(dados.get('vdm_medio', '-')),

            # Resultados Finais
            'espessura_base': str(res_dim.get('espessura_calculada', '-')),
            'perda': str(res_dim.get('perda_material', '-')),
            'espessura_final': str(res_dim.get('espessura_final', '-')),
        }

        # 3. Caminho do Arquivo HTML
        diretorio_atual = os.path.dirname(os.path.abspath(__file__))
        caminho_html = os.path.join(
            diretorio_atual, 'templates', 'relatorio.html')

        try:
            with open(caminho_html, 'r', encoding='utf-8') as arquivo:
                html_string = arquivo.read()

            django_engine = engines['django']
            template = django_engine.from_string(html_string)
            html_renderizado = template.render(context_dict)

            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="Memorial_RMPav.pdf"'

            pisa_status = pisa.CreatePDF(html_renderizado, dest=response)

            if pisa_status.err:
                return Response({'erro': 'Erro interno PDF'}, status=500)

            return response

        except Exception as e:
            print(f"ERRO PDF: {e}")
            return Response({'erro': str(e)}, status=500)
