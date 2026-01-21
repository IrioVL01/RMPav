import math

# =============================================================================
# MÓDULO 1: TRÁFEGO
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
# MÓDULO 2: DIMENSIONAMENTO
# =============================================================================


def solve_w18_ps(SN, delta_psi, mr_psi, Zr, So):
    try:
        if delta_psi <= 0:
            delta_psi = 0.1
        term1 = Zr * So
        term2 = 9.36 * math.log10(SN + 1) - 0.20
        termo_psi = math.log10(delta_psi / 2.7)
        den_psi = 0.4 + (1094 / ((SN + 1) ** 5.19))
        term3 = termo_psi / den_psi
        term4 = 2.32 * math.log10(mr_psi) - 8.07
        return 10 ** (term1 + term2 + term3 + term4)
    except:
        return 1.0


def solve_w18_case(D_pol, CASE, mr_psi):
    try:
        if str(CASE) == '1':
            return 0.05 * (mr_psi ** 0.8) * (D_pol ** 3.8)
        else:
            return 0.10 * (mr_psi ** 0.8) * (D_pol ** 3.8)
    except:
        return 1.0


def calcular_detalhado_mglit(dados):
    # 1. Inputs Básicos
    N = float(dados['n_projeto'])
    m_seco = float(dados['meses_seco'])
    m_umido = float(dados['meses_umido'])

    # 2. Critérios de Serviço
    p0 = float(dados.get('p0', 4.2))
    pt = float(dados.get('pt', 2.5))
    delta_psi = p0 - pt
    case_val = str(dados['case_pol'])

    # 3. Coeficientes (Já vêm calculados/escolhidos do Frontend)
    Zr = float(dados.get('zr'))
    So = float(dados.get('so', 0.45))

    # Coeficiente Estrutural (CE) e Drenagem (CD) da Base
    # O Frontend vai mandar o valor final escolhido pelo usuário
    a2 = float(dados.get('ce_base_adotado', 0.14))
    m2 = float(dados.get('cd_base_adotado', 1.0))

    # 4. Módulos de Resiliência (MR)
    # O Frontend já manda o valor escolhido em PSI
    mr_seco_base = float(dados['mr_base_adotado_psi'])
    mr_umido_sub = float(dados['mr_subleito_adotado_psi'])

    # 5. Tráfego Sazonal
    n_seco = N * (m_seco / 12.0)
    n_umido = N * (m_umido / 12.0)

    # 6. Tabela de Tentativas (Cálculo Iterativo)
    espessuras_pol = [4.0, 6.0, 8.0, 10.0, 12.0, 14.0]
    tabela_calculo = []

    espessura_media_calc = 0
    encontrou = False

    for D in espessuras_pol:
        # SN = D * CE * CD
        SN = D * a2 * m2

        # Capacidade PS
        w18_ps_seco = solve_w18_ps(SN, delta_psi, mr_seco_base, Zr, So)
        w18_ps_umido = solve_w18_ps(SN, delta_psi, mr_umido_sub, Zr, So)

        dano_ps = (n_seco / max(w18_ps_seco, 1)) + \
            (n_umido / max(w18_ps_umido, 1))

        # Capacidade CASE
        w18_case_seco = solve_w18_case(D, case_val, mr_seco_base)
        w18_case_umido = solve_w18_case(D, case_val, mr_umido_sub)

        dano_case = (n_seco / max(w18_case_seco, 1)) + \
            (n_umido / max(w18_case_umido, 1))

        tabela_calculo.append({
            "espessura_pol": D,
            "dano_ps": dano_ps,
            "dano_case": dano_case
        })

        if not encontrou and dano_ps <= 1.05 and dano_case <= 1.05:
            espessura_media_calc = D
            encontrou = True

    if espessura_media_calc == 0:
        espessura_media_calc = 15.0

    esp_media_cm = espessura_media_calc * 2.54

    # Gravel Loss
    vdm_medio = float(dados.get('vdm_medio', 0))
    is_seco = (dados.get('clima') == 'seco')
    taxa = 25 if vdm_medio <= 150 and is_seco else (
        35 if vdm_medio > 150 and is_seco else 47)
    gl_cm = (taxa * 10) / 10.0

    esp_final_cm = esp_media_cm + gl_cm

    return {
        "passo_1_n": N,
        "passo_3_tabela": tabela_calculo,
        "passo_5_mrs": {"seco": round(mr_seco_base, 0), "umido": round(mr_umido_sub, 0)},
        "passo_7_trafego_sazonal": {"seco": n_seco, "umido": n_umido},
        "passo_12_media_cm": round(esp_media_cm, 2),
        "passo_13_gl_cm": round(gl_cm, 2),
        "passo_13_final_cm": round(esp_final_cm, 2),
        "mr_seco_psi": round(mr_seco_base, 0),
        "mr_umido_psi": round(mr_umido_sub, 0),
        "status": "Dimensionado"
    }


def calcular_13_passos(dados): return calcular_detalhado_mglit(dados)
def calcular_espessura_usace(c, v, cl, a): return {}
