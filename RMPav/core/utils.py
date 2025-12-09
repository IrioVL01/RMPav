import math

# --- Constantes e Tabelas (Vindas do DimPav_v31) ---
VEHICLE_COMPOSITION = {
    "2C": [("simples_simples", "simples", 6.0), ("simples_dupla", "simples", 10.0)],
    "2CB": [("simples_simples", "simples", 6.0), ("simples_dupla", "simples", 10.0)],
    "3C": [("simples_simples", "simples", 6.0), ("tandem_duplo", "tandem_duplo", 17.0)],
    "2S1": [("simples_simples", "simples", 6.0), ("simples_dupla", "simples", 10.0), ("simples_dupla", "simples", 10.0)],
    "4CD": [("simples_simples", "simples", 6.0), ("simples_simples", "simples", 6.0), ("tandem_duplo", "tandem_duplo", 17.0)],
    # ... (Você pode adicionar os outros veículos da sua lista aqui depois)
}


def fc_aashto(P, tipo_eixo):
    """Calcula o Fator de Carga AASHTO"""
    if P <= 0:
        return 0
    try:
        if tipo_eixo == "simples_simples":
            return math.pow((P / 7.77), 4.32)
        elif tipo_eixo == "simples_dupla":
            return math.pow((P / 8.17), 4.32)
        elif tipo_eixo == "tandem_duplo":
            return math.pow((P / 15.08), 4.14)
        elif tipo_eixo == "tandem_triplo":
            return math.pow((P / 22.95), 4.22)
        return 0
    except:
        return 0


def calcular_n_total(anos, taxa_crescimento, fator_faixa, lista_veiculos):
    """
    Função principal que recebe os dados e devolve o N calculado.
    """
    i = taxa_crescimento / 100.0

    # Fator de Crescimento (Fórmula dos Juros Compostos)
    if i == 0:
        fc_t = anos
    else:
        fc_t = (((1 + i) ** anos) - 1) / i

    n_total_aashto = 0
    detalhamento = []

    for veiculo in lista_veiculos:
        classe = veiculo['classe']
        vdm = veiculo['vdm']

        if classe not in VEHICLE_COMPOSITION:
            continue

        # Calcular FV (Fator de Veículo)
        fv_atual = 0
        for (tipo_aashto, _, peso) in VEHICLE_COMPOSITION[classe]:
            fv_atual += fc_aashto(peso, tipo_aashto)

        # Calcular N parcial
        n_parcial = vdm * 365 * fator_faixa * fv_atual * fc_t

        n_total_aashto += n_parcial

        detalhamento.append({
            "classe": classe,
            "fv_calculado": round(fv_atual, 4),
            "n_contribuição": round(n_parcial, 2)
        })

    return {
        "n_total": round(n_total_aashto, 2),
        "fator_climatico_usado": round(fc_t, 4),
        "detalhes": detalhamento
    }

# Fuções para calcular o método USACE


def calcular_perda_material(vdm, clima, anos):
    """Calcula quantos cm de estrada somem com o tempo (Gravel Loss)"""
    # Taxas aproximadas baseadas em TRL (mm/ano)
    is_seco = (clima == 'seco')

    if vdm < 50:
        taxa = 15 if is_seco else 25
    elif vdm <= 150:
        taxa = 25 if is_seco else 37
    else:
        taxa = 35 if is_seco else 47

    # Perda em cm = (Taxa mm * Anos) / 10
    return (taxa * anos) / 10.0


def calcular_espessura_usace(cbr, vdm, clima, anos):
    """
    Calcula espessura para Revestimento Primário (Método USACE Simplificado)
    """
    # 1. Fórmula Base (CBR x VDM)
    if vdm <= 15:
        eq = (31.81, -0.40)
    elif vdm <= 40:
        eq = (40.08, -0.41)
    elif vdm <= 100:
        eq = (51.52, -0.42)
    elif vdm <= 250:
        eq = (67.57, -0.43)
    elif vdm <= 700:
        eq = (88.08, -0.44)
    elif vdm <= 2000:
        eq = (114.7, -0.45)
    else:
        eq = (148.8, -0.46)

    espessura_base = eq[0] * pow(cbr, eq[1])

    # 2. Perda de Material
    perda = calcular_perda_material(vdm, clima, anos)

    # 3. Final
    espessura_final = espessura_base + perda

    return {
        "espessura_calculada": round(espessura_base, 2),
        "perda_material": round(perda, 2),
        "espessura_final": round(espessura_final, 2),
        "categoria_trafego": f"VDM {vdm}"
    }
