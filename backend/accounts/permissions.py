
from rest_framework.permissions import BasePermission

class IsAdministrativo(BasePermission):
    """
    Permiso personalizado para permitir el acceso solo a usuarios 
    en el grupo 'Administrativo'.
    """
    def has_permission(self, request, view):
      
        return request.user.is_authenticated and request.user.groups.filter(name='Administrativo').exists()