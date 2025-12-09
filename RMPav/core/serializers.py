from rest_framework import serializers


class VeiculoItemSerializer(serializers.Serializer):
    classe = serializers.CharField(max_length=10)  # Ex: "2C"
    vdm = serializers.FloatField()                # Ex: 50.5


class CalculoTrafegoInputSerializer(serializers.Serializer):
    anos = serializers.IntegerField(min_value=1)
    taxa_crescimento = serializers.FloatField(min_value=0)
    fator_faixa = serializers.FloatField(min_value=0.1, max_value=1.0)
    veiculos = VeiculoItemSerializer(many=True)  # Uma lista de veículos

class DimensionamentoInputSerializer(serializers.Serializer):
    cbr_subleito = serializers.FloatField(min_value=1)
    vdm_medio = serializers.FloatField(min_value=1)
    anos_projeto = serializers.IntegerField(min_value=1)
    clima = serializers.ChoiceField(choices=["seco", "umido"])
    