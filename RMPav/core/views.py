import os
from django.template import engines
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from xhtml2pdf import pisa

from .serializers import CalculoTrafegoInputSerializer, DimensionamentoInputSerializer
from .utils import calcular_n_total, calcular_espessura_usace, calcular_13_passos

# --- FUNÇÃO DE FORMATAÇÃO CIENTÍFICA ---


def format_scientific(val):
    """
    Converte qualquer número para notação científica (Ex: 1.50e+05).
    Se for texto ou traço, mantém.
    """
    try:
        # Tenta limpar string se vier com unidades (ex: "20 cm")
        if isinstance(val, str):
            val = val.split(' ')[0]  # Pega só o número antes do espaço

        numero = float(val)
        if numero == 0:
            return "0.00e+00"

        # Formata com 2 casas decimais na mantissa (1.23e+02)
        return "{:.2e}".format(numero)
    except (ValueError, TypeError):
        return str(val)

# 1. TRÁFEGO


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

# 2. DIMENSIONAMENTO SIMPLES


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

# 3. DIMENSIONAMENTO 13 PASSOS


class Calcular13PassosView(APIView):
    def post(self, request):
        dados = request.data
        try:
            resultado = calcular_13_passos(dados)
            return Response(resultado, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# 4. GERAR PDF COMPLETO (TUDO CIENTÍFICO)


class GerarPDFView(APIView):
    def post(self, request):
        dados = request.data

        res_trafego = dados.get('resultado_trafego') or {}
        res_dim = dados.get('resultado_dim') or {}

        # Extração segura
        mrs = res_dim.get('passo_5_mrs') or {}
        if not isinstance(mrs, dict):
            mrs = {}

        mr_seco_raw = mrs.get('seco') or res_dim.get('mr_seco_psi', 0)
        mr_umido_raw = mrs.get('umido') or res_dim.get('mr_umido_psi', 0)

        esp_estrutural = res_dim.get('passo_12_media_cm') or 0
        gravel_loss = res_dim.get('passo_13_gl_cm') or 0
        esp_final = res_dim.get('passo_13_final_cm') or 0

        # Formata lista de veículos
        detalhes_raw = res_trafego.get('detalhes', [])
        detalhes_formatados = []
        for item in detalhes_raw:
            detalhes_formatados.append({
                'classe': item.get('classe'),
                'vdm': item.get('vdm'),
                'fv_aashto': item.get('fv_aashto'),
                'fv_usace': item.get('fv_usace'),
                # N Parcial em Científico
                'n_contribuição': format_scientific(item.get('n_contribuição', 0))
            })

        context_dict = {
            # GERAL
            'anos': str(dados.get('anos', '-')),
            'taxa': str(dados.get('taxa', '-')),
            'fator_faixa': str(dados.get('fator_faixa', '-')),

            # TRÁFEGO (CIENTÍFICO)
            'n_total_aashto': format_scientific(res_trafego.get('n_total_aashto', 0)),
            'n_total_usace': format_scientific(res_trafego.get('n_total_usace', 0)),
            'n_final': format_scientific(res_trafego.get('n_final_projeto', 0)),
            'metodo_escolhido': str(res_trafego.get('metodo_escolhido', '-')),
            'detalhes_trafego': detalhes_formatados,

            # DIMENSIONAMENTO
            'cbr': str(dados.get('cbr', '-')),
            'clima': str(dados.get('clima', '-')),
            'vdm_medio': str(dados.get('vdm_medio', '-')),
            'meses_seco': str(dados.get('meses_seco', '-')),
            'meses_umido': str(dados.get('meses_umido', '-')),
            'delta_psi': str(dados.get('delta_psi', '-')),
            'case_value': str(dados.get('case_value', '-')),

            # RESULTADOS FINAIS (AGORA TUDO EM CIENTÍFICO)
            'mr_seco': format_scientific(mr_seco_raw),
            'mr_umido': format_scientific(mr_umido_raw),
            'espessura_estrutural': format_scientific(esp_estrutural),
            'gravel_loss': format_scientific(gravel_loss),
            'espessura_final': format_scientific(esp_final),

            'status': str(res_dim.get('status', 'Dimensionado')),
        }

        return renderizar_pdf(context_dict, 'Memorial_RMPav.pdf')

# 5. GERAR PDF PARCIAL (SÓ TRÁFEGO)


class GerarPDFTrafegoView(APIView):
    def post(self, request):
        dados = request.data
        res_trafego = dados.get('resultado_trafego') or {}

        # Detalhes em Científico
        detalhes_raw = res_trafego.get('detalhes', [])
        detalhes_formatados = []
        for item in detalhes_raw:
            detalhes_formatados.append({
                'classe': item.get('classe'),
                'vdm': item.get('vdm'),
                'fv_aashto': item.get('fv_aashto'),
                'fv_usace': item.get('fv_usace'),
                'n_contribuição': format_scientific(item.get('n_contribuição', 0))
            })

        # Progressão em Científico
        progressao_raw = res_trafego.get('progressao', [])
        progressao_formatada = []
        for item in progressao_raw:
            progressao_formatada.append({
                'ano': item.get('ano'),
                'n_aashto_acumulado': format_scientific(item.get('n_aashto_acumulado', 0)),
                'n_usace_acumulado': format_scientific(item.get('n_usace_acumulado', 0))
            })

        context_dict = {
            'tipo_relatorio': 'Parcial - Análise de Tráfego',
            'anos': str(dados.get('anos', '-')),
            'taxa': str(dados.get('taxa', '-')),
            'fator_faixa': str(dados.get('fator_faixa', '-')),

            # TOTAIS CIENTÍFICOS
            'n_total_aashto': format_scientific(res_trafego.get('n_total_aashto', 0)),
            'n_total_usace': format_scientific(res_trafego.get('n_total_usace', 0)),
            'n_final': format_scientific(res_trafego.get('n_final_projeto', 0)),

            'metodo_escolhido': str(res_trafego.get('metodo_escolhido', '-')),
            'detalhes_trafego': detalhes_formatados,
            'progressao': progressao_formatada,

            'ocultar_dimensionamento': True
        }

        return renderizar_pdf(context_dict, 'Relatorio_Trafego.pdf')

# --- RENDERIZAÇÃO GENÉRICA ---


def renderizar_pdf(contexto, nome_arquivo):
    diretorio_atual = os.path.dirname(os.path.abspath(__file__))
    caminho_html = os.path.join(diretorio_atual, 'templates', 'relatorio.html')

    try:
        with open(caminho_html, 'r', encoding='utf-8') as arquivo:
            html_string = arquivo.read()

        django_engine = engines['django']
        template = django_engine.from_string(html_string)
        html_renderizado = template.render(contexto)

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{nome_arquivo}"'

        pisa_status = pisa.CreatePDF(html_renderizado, dest=response)

        if pisa_status.err:
            return Response({'erro': 'Erro interno ao criar PDF'}, status=500)

        return response

    except FileNotFoundError:
        return Response({'erro': 'Template HTML não encontrado'}, status=500)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)
