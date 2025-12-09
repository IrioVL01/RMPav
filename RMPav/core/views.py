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

        # 1. Extração Segura (Garante que nada seja None)
        res_trafego = dados.get('resultado_trafego') or {}
        res_dim = dados.get('resultado_dim') or {}

        # Dica: Convertendo tudo para string (str) ou valor padrão para evitar erro de NoneType
        context_dict = {
            'anos': str(dados.get('anos', '-')),
            'taxa': str(dados.get('taxa', '-')),
            'fator_faixa': str(dados.get('fator_faixa', '-')),

            'n_total': str(res_trafego.get('n_total', 'Não calculado')),
            'fator_climatico': str(res_trafego.get('fator_climatico_usado', '-')),
            # Lista vazia se não tiver
            'detalhes_trafego': res_trafego.get('detalhes', []),

            'cbr': str(dados.get('cbr', '-')),
            'clima': str(dados.get('clima', '-')),
            'vdm_medio': str(dados.get('vdm_medio', '-')),

            'espessura_base': str(res_dim.get('espessura_calculada', '-')),
            'perda': str(res_dim.get('perda_material', '-')),
            'espessura_final': str(res_dim.get('espessura_final', '-')),
        }

        # 2. Caminho Manual do Arquivo
        diretorio_atual = os.path.dirname(os.path.abspath(__file__))
        caminho_html = os.path.join(
            diretorio_atual, 'templates', 'relatorio.html')

        print(f"Lendo HTML em: {caminho_html}")

        try:
            # 3. Lê o HTML do disco
            with open(caminho_html, 'r', encoding='utf-8') as arquivo:
                html_string = arquivo.read()

            # 4. Renderiza usando a ENGINE do Django (Mais robusto)
            django_engine = engines['django']
            template = django_engine.from_string(html_string)
            html_renderizado = template.render(context_dict)

            # 5. Gera o PDF
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="Memorial_RMPav.pdf"'

            pisa_status = pisa.CreatePDF(html_renderizado, dest=response)

            if pisa_status.err:
                return Response({'erro': 'Erro interno na biblioteca PDF'}, status=500)

            return response

        except FileNotFoundError:
            print("ARQUIVO HTML NÃO ENCONTRADO!")
            return Response({'erro': 'Template HTML sumiu'}, status=500)
        except Exception as e:
            # Esse print vai nos dizer exatamente o que houve se der erro de novo
            import traceback
            traceback.print_exc()
            print(f"ERRO CRÍTICO: {e}")
            return Response({'erro': str(e)}, status=500)
