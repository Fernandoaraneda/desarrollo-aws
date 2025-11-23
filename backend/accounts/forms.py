from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import Usuario

class UsuarioCreationForm(UserCreationForm):
    rut = forms.CharField(max_length=12, required=True, help_text="Ej: 12345678-9")

    class Meta:
        model = Usuario
        fields = ('username', 'rut', 'password1', 'password2', 'first_name', 'last_name', 'email', 'telefono')
