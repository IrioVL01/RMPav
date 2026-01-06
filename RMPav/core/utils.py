import math

# --- FATORES DE VEÍCULOS (MANTIDOS) ---
FC_AASHTO = {"RS": 0.33, "RD": 2.39, "TD": 1.64, "TT": 1.56}
FC_USACE = {"RS": 0.28, "RD": 3.29, "TD": 8.55, "TT": 9.30}

VEHICLE_COMPOSITION = {
    "2C": ["RS", "RD"], "2CB": ["RS", "RD"], "3C": ["RS", "TD"],
    "3T6": ["RS", "TD", "TD", "TD", "TD"], "4CD": ["RS", "RS", "TD"],
    "2S1": ["RS", "RD", "RD"], "2S2": ["RS", "RD", "TD"], "2S3": ["RS", "RD", "TT"],
    "3S2": ["RS", "TD", "TD"], "3S3": ["RS", "TD", "TT"],
}

# --- FUNÇÕES AUXILIARES ---


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

    # Gera progressão para gráfico
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

# --- CÁLCULO DOS 13 PASSOS (ESTILO PLANILHA) ---


def calcular_mr_psi(cbr):
    """Estima MR em psi"""
    return 1500 * cbr if cbr > 0 else 1500


def solve_w18_ps(SN, delta_psi, mr_psi, Zr, So):
    """Capacidade PS (AASHTO 93)"""
    try:
        # log10(W18) = Zr*So + 9.36*log(SN+1) - 0.20 + (log(dPSI/2.7) / (0.4 + 1094/(SN+1)^5.19)) + 2.32*log(MR) - 8.07
        term1 = Zr * So
        term2 = 9.36 * math.log10(SN + 1) - 0.20

        # PSI Loss term (2.7 = 4.2 - 1.5 standard) -> Usando o delta inserido
        # Se delta_psi for muito diferente, ajustamos a base. A planilha usa log(dPSI / (4.2-1.5))
        term_psi = math.log10(delta_psi / 2.7)
        den_psi = 0.4 + (1094 / ((SN + 1) ** 5.19))

        term3 = term_psi / den_psi
        term4 = 2.32 * math.log10(mr_psi) - 8.07

        log_w18 = term1 + term2 + term3 + term4
        return 10 ** log_w18
    except:
        return 1


def solve_w18_case(D_pol, CASE, mr_psi):
    """Capacidade Rutting (CASE 1 ou 2)"""
    try:
        # Coeficientes C1 e C2 aproximados das curvas USACE
        # W18 = C * MR^A * D^B
        if str(CASE) == '1':
            # Aproximação CASE 1
            return 0.05 * (mr_psi ** 0.8) * (D_pol ** 3.8)
        else:
            # Aproximação CASE 2
            return 0.10 * (mr_psi ** 0.8) * (D_pol ** 3.8)
    except:
        return 1


def calcular_detalhado_mglit(dados):
    # 1. Inputs
    N = float(dados['n_projeto'])
    m_seco = float(dados['meses_seco'])
    m_umido = float(dados['meses_umido'])
    delta_psi = float(dados['delta_psi'])
    case_val = str(dados['case_value'])
    Zr = float(dados['zr'])
    So = float(dados['so'])

    # 5. MRs
    if dados['metodo_mr'] == 'manual':
        mr_seco = float(dados['mr_base_manual']) * 145.038
        mr_umido = float(dados['mr_subleito_manual']) * 145.038
    else:
        cbr_sub = float(dados['cbr_subleito'])
        cbr_base = float(dados['cbr_base'])
        # Na planilha, MR Base geralmente é usado no cálculo estrutural principal (seco)
        # e o Subleito no úmido, ou aplica-se fator sazonal.
        # Vamos seguir a lógica: MR Seco = Base, MR Úmido = Subleito (Simplificação conservadora)
        mr_seco = calcular_mr_psi(cbr_base)
        mr_umido = calcular_mr_psi(cbr_sub)

    # 7. Tráfego Sazonal (FTP)
    n_seco = N * (m_seco / 12.0)
    n_umido = N * (m_umido / 12.0)

    # 3. Espessuras Estimadas (5 Pontos para tabela)
    # Geralmente começa em 4 pol e vai subindo
    espessuras_pol = [4.0, 6.0, 8.0, 10.0, 12.0]
    tabela_calculo = []

    a2 = 0.14  # Coeficiente estrutural base granular
    m2 = 1.0  # Coeficiente drenagem

    espessura_final_calc = 0
    encontrou = False

    # Itera sobre as espessuras para montar a tabela (Passos 8 a 11)
    for D in espessuras_pol:
        SN = D * a2 * m2

        # 8. Tráfego Adm PS
        w18_ps_seco = solve_w18_ps(SN, delta_psi, mr_seco, Zr, So)
        w18_ps_umido = solve_w18_ps(SN, delta_psi, mr_umido, Zr, So)

        # 9. Danos PS
        dano_ps = (n_seco / w18_ps_seco) + (n_umido / w18_ps_umido)

        # 10. Tráfego Adm CASE
        w18_case_seco = solve_w18_case(D, case_val, mr_seco)
        w18_case_umido = solve_w18_case(D, case_val, mr_umido)

        # 11. Danos CASE
        dano_case = (n_seco / w18_case_seco) + (n_umido / w18_case_umido)

        # Salva na tabela
        tabela_calculo.append({
            "espessura_pol": D,
            "dano_ps": dano_ps,
            "dano_case": dano_case
        })

    # 12. Espessura Média (Interpolação onde Dano = 1.0)
    # Simplificação: Pega o primeiro que Dano < 1.0
    D_necessario = 0
    for linha in tabela_calculo:
        if linha['dano_ps'] <= 1.0 and linha['dano_case'] <= 1.0:
            D_necessario = linha['espessura_pol']
            break

    if D_necessario == 0:
        D_necessario = 13.0  # Acima do limite da tabela

    esp_media_cm = D_necessario * 2.54

    # 13. Espessura Final (Com Gravel Loss)
    # Gravel Loss calculation
    vdm_ref = N / (365 * 10)  # estimativa
    is_seco = (dados['clima'] == 'seco')
    taxa_gl = 25 if is_seco else 35  # Valor médio
    gl_cm = (taxa_gl * 10) / 10.0  # 10 anos projeto fixo p/ perda

    esp_final_cm = esp_media_cm + gl_cm

    return {
        "passo_1_n": N,
        "passo_2_clima": dados['clima'],
        "passo_3_tabela": tabela_calculo,
        "passo_4_params": {"delta_psi": delta_psi, "case": case_val},
        "passo_5_mrs": {"seco": mr_seco, "umido": mr_umido},
        "passo_6_coeffs": {"zr": Zr, "so": So, "a2": a2},
        "passo_7_trafego_sazonal": {"seco": n_seco, "umido": n_umido},
        "passo_12_media_cm": round(esp_media_cm, 2),
        "passo_13_gl_cm": round(gl_cm, 2),
        "passo_13_final_cm": round(esp_final_cm, 2)
    }

# Função wrapper para manter compatibilidade com view antiga se precisar


def calcular_13_passos(dados):
    return calcular_detalhado_mglit(dados)


def calcular_espessura_usace(cbr, vdm, clima, anos): return {}  # Placeholder
