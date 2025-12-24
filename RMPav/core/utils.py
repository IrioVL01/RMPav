import math

# --- FATORES DE EQUIVALÊNCIA DA PLANILHA MGLIT ---
# (Valores fixos para garantir precisão com a planilha)
FC_AASHTO = {
    "RS": 0.33,   # Eixo Simples Rodagem Simples (6t)
    "RD": 2.39,   # Eixo Simples Rodagem Dupla (10t)
    "TD": 1.64,   # Tandem Duplo (17t)
    "TT": 1.56    # Tandem Triplo (25.5t)
}

FC_USACE = {
    "RS": 0.28,
    "RD": 3.29,
    "TD": 8.55,
    "TT": 9.30
}

# --- COMPOSIÇÃO DOS VEÍCULOS (Baseado na Planilha) ---
# Estrutura: [Tipo_Eixo, Tipo_Eixo, ...]
VEHICLE_COMPOSITION = {
    "2C":  ["RS", "RD"],         # Toco
    "2CB": ["RS", "RD"],         # Baú (Igual ao 2C na planilha)
    "3C":  ["RS", "TD"],         # Truck
    # Baseado no FVi AASHTO de 6.90 (~0.33 + 4*1.64)
    "3T6": ["RS", "TD", "TD", "TD", "TD"],
    # Baseado no FVi AASHTO de 2.30 (2*0.33 + 1.64)
    "4CD": ["RS", "RS", "TD"],
    "2S1": ["RS", "RD", "RD"],
    "2S2": ["RS", "RD", "TD"],
    "2S3": ["RS", "RD", "TT"],
    "3S2": ["RS", "TD", "TD"],
    "3S3": ["RS", "TD", "TT"],
}


def calcular_fv_exato(classe, metodo="AASHTO"):
    """Calcula o Fator de Veículo somando os fatores dos eixos"""
    if classe not in VEHICLE_COMPOSITION:
        return 0.0

    eixos = VEHICLE_COMPOSITION[classe]
    tabela = FC_AASHTO if metodo == "AASHTO" else FC_USACE

    fv_total = sum([tabela.get(eixo, 0) for eixo in eixos])
    return fv_total


def calcular_n_total(anos, taxa_crescimento, fator_faixa, lista_veiculos):
    """
    Calcula N AASHTO e USACE com progressão anual.
    """
    i = taxa_crescimento / 100.0

    # 1. Calcular N do primeiro ano (Ano 1) para a frota inteira
    n1_aashto_total = 0
    n1_usace_total = 0

    detalhes_veiculos = []

    for veiculo in lista_veiculos:
        classe = veiculo['classe']
        vdm = veiculo['vdm']

        # Pega FV exato da planilha
        fv_aashto = calcular_fv_exato(classe, "AASHTO")
        fv_usace = calcular_fv_exato(classe, "USACE")

        # N1 = VDM x 365 x FatorFaixa x FV
        n1_a = vdm * 365 * fator_faixa * fv_aashto
        n1_u = vdm * 365 * fator_faixa * fv_usace

        n1_aashto_total += n1_a
        n1_usace_total += n1_u

        detalhes_veiculos.append({
            "classe": classe,
            "vdm": vdm,
            "fv_aashto": round(fv_aashto, 2),
            "fv_usace": round(fv_usace, 2)
        })

    # 2. Calcular Progressão Anual (Acumulado)
    progressao = []
    acumulado_aashto = 0
    acumulado_usace = 0

    for ano in range(1, anos + 1):
        # Fator de crescimento para o ano X: (1+i)^(ano-1)
        fator_cresc = (1 + i) ** (ano - 1)

        n_ano_aashto = n1_aashto_total * fator_cresc
        n_ano_usace = n1_usace_total * fator_cresc

        acumulado_aashto += n_ano_aashto
        acumulado_usace += n_ano_usace

        progressao.append({
            "ano": ano,
            "n_aashto_acumulado": round(acumulado_aashto, 0),
            "n_usace_acumulado": round(acumulado_usace, 0)
        })

    # O N de Projeto é o maior entre os dois no último ano
    n_final_projeto = max(acumulado_aashto, acumulado_usace)

    return {
        "n_total_aashto": round(acumulado_aashto, 0),
        "n_total_usace": round(acumulado_usace, 0),
        "n_final_projeto": round(n_final_projeto, 0),
        "metodo_escolhido": "USACE" if acumulado_usace > acumulado_aashto else "AASHTO",
        "detalhes": detalhes_veiculos,
        "progressao": progressao
    }

# --- MANTENHA A FUNÇÃO DE DIMENSIONAMENTO E GRAVEL LOSS ---


def calcular_perda_material(vdm, clima, anos):
    is_seco = (clima == 'seco')
    if vdm < 50:
        taxa = 15 if is_seco else 25
    elif vdm <= 150:
        taxa = 25 if is_seco else 37
    else:
        taxa = 35 if is_seco else 47
    return (taxa * anos) / 10.0


def calcular_espessura_usace(cbr, vdm, clima, anos):
    # Fórmula USACE
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
    perda = calcular_perda_material(vdm, clima, anos)
    espessura_final = espessura_base + perda

    return {
        "espessura_calculada": round(espessura_base, 2),
        "perda_material": round(perda, 2),
        "espessura_final": round(espessura_final, 2),
        "categoria_trafego": f"VDM {vdm}"
    }


