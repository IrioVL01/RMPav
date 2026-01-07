import math

# =============================================================================
# MÓDULO 1: TRÁFEGO (AASHTO / USACE)
# =============================================================================

FC_AASHTO = {"RS": 0.33, "RD": 2.39, "TD": 1.64, "TT": 1.56}
FC_USACE = {"RS": 0.28, "RD": 3.29, "TD": 8.55, "TT": 9.30}

VEHICLE_COMPOSITION = {
    "2C": ["RS", "RD"], "2CB": ["RS", "RD"], "3C": ["RS", "TD"],
    "3T6": ["RS", "TD", "TD", "TD", "TD"], "4CD": ["RS", "RS", "TD"],
    "2S1": ["RS", "RD", "RD"], "2S2": ["RS", "RD", "TD"], "2S3": ["RS", "RD", "TT"],
    "3S2": ["RS", "TD", "TD"], "3S3": ["RS", "TD", "TT"],
}


def calcular_fv_exato(classe, metodo="AASHTO"):
    if classe not in VEHICLE_COMPOSITION:
        return 0.0
    eixos = VEHICLE_COMPOSITION[classe]
    tabela = FC_AASHTO if metodo == "AASHTO" else FC_USACE
    return sum([tabela.get(eixo, 0) for eixo in eixos])


def calcular_n_total(anos, taxa_crescimento, fator_faixa, lista_veiculos):
    i = taxa_crescimento / 100.0
    fc_t = anos if i == 0 else (((1 + i) ** anos) - 1) / i

    n1_aashto_total = 0
    n1_usace_total = 0
    detalhes = []

    for v in lista_veiculos:
        fv_a = calcular_fv_exato(v['classe'], "AASHTO")
        fv_u = calcular_fv_exato(v['classe'], "USACE")
        n1_a = v['vdm'] * 365 * fator_faixa * fv_a
        n1_u = v['vdm'] * 365 * fator_faixa * fv_u
        n1_aashto_total += n1_a
        n1_usace_total += n1_u
        detalhes.append({"classe": v['classe'], "vdm": v['vdm'], "fv_aashto": round(
            fv_a, 2), "fv_usace": round(fv_u, 2)})

    acum_aashto = n1_aashto_total * fc_t
    acum_usace = n1_usace_total * fc_t

    progressao = []
    aa_temp, au_temp = 0, 0
    for ano in range(1, anos + 1):
        fator = (1 + i) ** (ano - 1)
        aa_temp += n1_aashto_total * fator
        au_temp += n1_usace_total * fator
        progressao.append({"ano": ano, "n_aashto_acumulado": round(
            aa_temp, 0), "n_usace_acumulado": round(au_temp, 0)})

    return {
        "n_total_aashto": round(acum_aashto, 0),
        "n_total_usace": round(acum_usace, 0),
        "n_final_projeto": round(max(acum_aashto, acum_usace), 0),
        "metodo_escolhido": "USACE" if acum_usace > acum_aashto else "AASHTO",
        "detalhes": detalhes,
        "progressao": progressao
    }

# =============================================================================
# MÓDULO 2: DIMENSIONAMENTO (13 PASSOS - MGLIT)
# =============================================================================


def calcular_mr_psi_subleito(cbr):
    """Estima MR do Subleito (Saturado/Úmido)"""
    # Padrão AASHTO: 1500 * CBR
    if cbr <= 0:
        return 1500
    return 1500 * cbr


def calcular_mr_psi_base(cbr, metodo):
    """Estima MR da Base (Seco) usando Brown ou Preussler"""
    if cbr <= 0:
        cbr = 1

    if metodo == 'brown':
        # Brown et al. (1990) - Aproximação paramétrica
        # MR (psi) ~= 2555 * CBR^0.64
        return 2555 * (cbr ** 0.64)
    elif metodo == 'preussler':
        # Preussler (1983): MR (MPa) ~= 4 a 6x CBR?
        # Na planilha MGLIT, Preussler geralmente dá valores bem altos.
        # Aproximação comum: MR(psi) = 2200 * CBR (ajustado para bater com tabelas)
        return 2200 * (cbr ** 0.55)  # Ajuste fino para não explodir
    else:
        # Padrão 1500 * CBR
        return 1500 * cbr


def solve_w18_ps(SN, delta_psi, mr_psi, Zr, So):
    """
    Capacidade de Tráfego por Perda de Serventia (PSI)
    AASHTO 93 Equation
    """
    try:
        # Log10(W18)
        term1 = Zr * So
        term2 = 9.36 * math.log10(SN + 1) - 0.20

        # Termo de Perda de Serventia
        # A norma usa 4.2 - 1.5 = 2.7 como base padrão.
        # Se o delta_psi do usuário for diferente, a fórmula se ajusta.
        termo_psi = math.log10(delta_psi / 2.7)  # Se delta=1.7 e base=2.7
        den_psi = 0.4 + (1094 / ((SN + 1) ** 5.19))

        term3 = termo_psi / den_psi
        term4 = 2.32 * math.log10(mr_psi) - 8.07

        log_w18 = term1 + term2 + term3 + term4
        return 10 ** log_w18
    except:
        return 1.0  # Evita divisão por zero


def solve_w18_case(D_pol, CASE, mr_psi):
    """
    Capacidade de Tráfego por Trilha de Roda (CASE - Rutting)
    Baseado nas curvas do USACE
    """
    try:
        # Fórmulas aproximadas das curvas do ábaco
        if str(CASE) == '1':
            return 0.05 * (mr_psi ** 0.8) * (D_pol ** 3.8)
        else:
            return 0.10 * (mr_psi ** 0.8) * (D_pol ** 3.8)
    except:
        return 1.0


def calcular_detalhado_mglit(dados):
    # 1. Inputs do Frontend
    N = float(dados['n_projeto'])
    m_seco = float(dados['meses_seco'])
    m_umido = float(dados['meses_umido'])

    # 4. PS e CASE
    p0 = float(dados.get('p0', 4.2))
    pt = float(dados.get('pt', 2.5))
    delta_psi = p0 - pt
    if delta_psi <= 0:
        delta_psi = 0.1  # Segurança

    case_val = str(dados['case_pol'])

    # 6. Coeficientes
    Zr = float(dados.get('zr', -1.282))
    So = float(dados.get('so', 0.45))
    a2 = float(dados.get('a2', 0.14))  # Coef. Estrutural
    m2 = float(dados.get('m2', 1.0))  # Coef. Drenagem

    # 5. MR (Módulos de Resiliência)
    if dados.get('usa_mr_manual'):
        # Se usuário digitou direto
        mr_seco = float(dados['mr_base_manual'])
        mr_umido = float(dados['mr_subleito_manual'])
        # Garantir que está em PSI (se o user digitou MPa, converter)
        # Assumindo que o front manda PSI se for manual, ou convertendo aqui:
        # Se for < 1000 provavel que seja MPa
        if mr_seco < 1000:
            mr_seco *= 145.038
        if mr_umido < 1000:
            mr_umido *= 145.038
    else:
        # Cálculo Automático
        cbr_sub = float(dados['cbr_subleito'])
        cbr_base = float(dados['cbr_base'])
        metodo_base = dados.get('metodo_mr_base', 'brown')

        # Lógica Sazonal da Planilha:
        # Seco = Base Granular (Resistente)
        # Úmido = Subleito Saturado (Fraco)
        mr_seco = calcular_mr_psi_base(cbr_base, metodo_base)
        mr_umido = calcular_mr_psi_subleito(cbr_sub)

    # 7. Tráfego Sazonal (FTP)
    n_seco = N * (m_seco / 12.0)
    n_umido = N * (m_umido / 12.0)

    # 3. Espessuras Estimadas (Loop para Tabela)
    espessuras_pol = [4.0, 6.0, 8.0, 10.0, 12.0]
    tabela_calculo = []

    espessura_media_calc = 0
    encontrou_aprovacao = False

    for D in espessuras_pol:
        # SN = D * a2 * m2 (Estrutural * Drenagem)
        SN = D * a2 * m2

        # 8. Capacidade PS (Seco e Úmido)
        w18_ps_seco = solve_w18_ps(SN, delta_psi, mr_seco, Zr, So)
        w18_ps_umido = solve_w18_ps(SN, delta_psi, mr_umido, Zr, So)

        # 9. Dano PS
        # Dano = (N_aplicado / N_admissivel)
        # Evita divisão por zero
        w18_ps_seco = max(w18_ps_seco, 1)
        w18_ps_umido = max(w18_ps_umido, 1)

        dano_ps = (n_seco / w18_ps_seco) + (n_umido / w18_ps_umido)

        # 10. Capacidade CASE (Seco e Úmido)
        w18_case_seco = solve_w18_case(D, case_val, mr_seco)
        w18_case_umido = solve_w18_case(D, case_val, mr_umido)

        # 11. Dano CASE
        w18_case_seco = max(w18_case_seco, 1)
        w18_case_umido = max(w18_case_umido, 1)

        dano_case = (n_seco / w18_case_seco) + (n_umido / w18_case_umido)

        tabela_calculo.append({
            "espessura_pol": D,
            "dano_ps": dano_ps,
            "dano_case": dano_case
        })

        # Verifica se passou (Dano <= 1.0 com tolerância pequena)
        if not encontrou_aprovacao and dano_ps <= 1.05 and dano_case <= 1.05:
            espessura_media_calc = D
            encontrou_aprovacao = True

    # Se não encontrou na tabela, extrapola ou fixa no máximo
    if espessura_media_calc == 0:
        # Lógica simples: se o dano do último (12") ainda é alto, sugere mais
        last = tabela_calculo[-1]
        if last['dano_ps'] > 1 or last['dano_case'] > 1:
            espessura_media_calc = 14.0  # Sugestão acima da tabela
        else:
            espessura_media_calc = 4.0  # Mínimo

    # 12. Espessura Média (Convertendo para cm)
    esp_media_cm = espessura_media_calc * 2.54

    # 13. Espessura Final (Gravel Loss)
    # GL = (Taxa * Anos) / 10
    # Taxa (mm/ano): <50 vdm = 15/25, <150 = 25/37, >150 = 35/47
    vdm_medio = float(dados.get('vdm_medio', 0))
    is_seco = (dados.get('clima') == 'seco')

    if vdm_medio < 50:
        taxa = 15 if is_seco else 25
    elif vdm_medio <= 150:
        taxa = 25 if is_seco else 37
    else:
        taxa = 35 if is_seco else 47

    # OBS: O app calcula GL fixo para 10 anos, ou proporcional aos anos de projeto?
    # Geralmente repõe-se material, mas o cálculo de projeto inicial prevê um período.
    # Vamos usar os anos de projeto do input, ou fixar 10 se não vier.
    # A função anterior usava 10 fixo. Se quiser mudar, use dados['anos_projeto'].
    gl_cm = (taxa * 10) / 10.0  # Fixado em 10 anos conforme USACE padrão

    esp_final_cm = esp_media_cm + gl_cm

    return {
        "passo_1_n": N,
        "passo_3_tabela": tabela_calculo,
        "passo_5_mrs": {"seco": round(mr_seco, 0), "umido": round(mr_umido, 0)},
        "passo_7_trafego_sazonal": {"seco": n_seco, "umido": n_umido},
        "passo_12_media_cm": round(esp_media_cm, 2),
        "passo_13_gl_cm": round(gl_cm, 2),
        "passo_13_final_cm": round(esp_final_cm, 2),
        # Retorna MRs soltos também para o PDF antigo se precisar
        "mr_seco_psi": round(mr_seco, 0),
        "mr_umido_psi": round(mr_umido, 0),
        "status": "Dimensionado"
    }

# Funções Wrapper para compatibilidade


def calcular_13_passos(dados): return calcular_detalhado_mglit(dados)
def calcular_espessura_usace(c, v, cl, a): return {}
