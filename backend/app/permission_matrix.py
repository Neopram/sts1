"""
Centralized Permission Matrix for STS Clearance Hub
Single source of truth for all role-based permissions
"""

from typing import Dict, List, Set


class PermissionMatrix:
    """
    Central permission matrix defining what each role can do
    Organized by resource and action
    """

    # Master permission matrix - SINGLE SOURCE OF TRUTH
    PERMISSIONS: Dict[str, Dict[str, List[str]]] = {
        # Document Management Permissions
        "documents": {
            "view": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "list": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "upload": ["owner", "broker", "charterer", "seller", "buyer"],
            "approve": ["owner", "broker", "charterer", "admin"],
            "reject": ["owner", "broker", "charterer", "admin"],
            "download": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "delete": ["owner", "broker", "admin"],
            "update": ["owner", "broker", "admin"],
        },
        # Approval Workflow Permissions
        "approvals": {
            "view": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "list": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "create": ["owner", "broker", "charterer"],
            "update": ["owner", "broker", "charterer", "admin"],
            "delete": ["owner", "broker", "admin"],
            "revoke": ["owner", "broker", "admin"],
        },
        # User Management Permissions
        "users": {
            "view": ["admin"],
            "list": ["admin"],
            "create": ["admin"],
            "update": ["admin"],
            "delete": ["admin"],
            "change_role": ["admin"],
        },
        # Room Management Permissions
        "rooms": {
            "view": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "list": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "create": ["broker", "admin"],
            "update": ["broker", "admin"],
            "delete": ["admin"],
            "manage_parties": ["broker", "admin"],
        },
        # Vessel Management Permissions
        "vessels": {
            "view": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "list": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "create": ["broker", "admin"],
            "update": ["broker", "admin"],
            "delete": ["admin"],
        },
        # Activity & Audit Log Permissions
        "activities": {
            "view_own": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "view_all": ["admin"],
            "list_own": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "list_all": ["admin"],
            "export": ["admin"],
        },
        # Configuration Permissions
        "config": {
            "view": ["admin"],
            "update": ["admin"],
            "manage_document_types": ["admin"],
            "manage_feature_flags": ["admin"],
        },
        # Snapshots & Historical Records Permissions
        "snapshots": {
            "view": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "list": ["owner", "broker", "charterer", "seller", "buyer", "admin"],
            "create": ["owner", "broker", "charterer", "admin"],
            "delete": ["admin"],
        },
    }

    # Role hierarchy - for future role inheritance
    ROLE_HIERARCHY = {
        "admin": ["owner", "broker", "charterer", "seller", "buyer"],  # Admin can do everything
        "broker": ["owner", "charterer", "seller", "buyer"],
        "owner": [],
        "charterer": [],
        "seller": [],
        "buyer": [],
    }

    @classmethod
    def has_permission(cls, role: str, resource: str, action: str) -> bool:
        """
        Check if a role has permission to perform an action on a resource

        Args:
            role: User's role (owner, broker, charterer, seller, buyer, admin)
            resource: Resource name (documents, approvals, users, etc.)
            action: Action to perform (view, approve, delete, etc.)

        Returns:
            True if role is allowed, False otherwise
        """
        # Admin has all permissions
        if role == "admin":
            return True

        # Check if resource exists
        if resource not in cls.PERMISSIONS:
            return False

        # Check if action exists for resource
        if action not in cls.PERMISSIONS[resource]:
            return False

        # Check if role is in allowed roles for this action
        allowed_roles = cls.PERMISSIONS[resource][action]
        return role in allowed_roles

    @classmethod
    def get_allowed_roles(cls, resource: str, action: str) -> List[str]:
        """
        Get all roles allowed to perform an action on a resource

        Args:
            resource: Resource name
            action: Action to perform

        Returns:
            List of allowed roles
        """
        if resource not in cls.PERMISSIONS:
            return []

        if action not in cls.PERMISSIONS[resource]:
            return []

        return cls.PERMISSIONS[resource][action]

    @classmethod
    def get_allowed_actions(cls, role: str, resource: str) -> List[str]:
        """
        Get all actions a role can perform on a resource

        Args:
            role: User's role
            resource: Resource name

        Returns:
            List of allowed actions
        """
        if role == "admin":
            # Admin can do all actions for a resource
            if resource not in cls.PERMISSIONS:
                return []
            return list(cls.PERMISSIONS[resource].keys())

        if resource not in cls.PERMISSIONS:
            return []

        allowed_actions = []
        for action, allowed_roles in cls.PERMISSIONS[resource].items():
            if role in allowed_roles:
                allowed_actions.append(action)

        return allowed_actions

    @classmethod
    def get_allowed_resources(cls, role: str) -> Dict[str, List[str]]:
        """
        Get all resources and actions a role can access

        Args:
            role: User's role

        Returns:
            Dictionary mapping resources to allowed actions
        """
        result = {}

        if role == "admin":
            # Admin can access all resources
            for resource, actions in cls.PERMISSIONS.items():
                result[resource] = list(actions.keys())
        else:
            # For other roles, find what they can access
            for resource, actions in cls.PERMISSIONS.items():
                allowed_actions = []
                for action, allowed_roles in actions.items():
                    if role in allowed_roles:
                        allowed_actions.append(action)

                if allowed_actions:
                    result[resource] = allowed_actions

        return result

    @classmethod
    def get_matrix_for_role(cls, role: str) -> Dict[str, Dict[str, bool]]:
        """
        Get complete permission matrix for a role (useful for UI/display)

        Args:
            role: User's role

        Returns:
            Dictionary showing what role can do for each resource/action
        """
        matrix = {}

        for resource, actions in cls.PERMISSIONS.items():
            matrix[resource] = {}
            for action in actions.keys():
                matrix[resource][action] = cls.has_permission(role, resource, action)

        return matrix

    @classmethod
    def validate_permission(
        cls, role: str, resource: str, action: str
    ) -> tuple[bool, str]:
        """
        Validate permission and return result with message

        Args:
            role: User's role
            resource: Resource name
            action: Action to perform

        Returns:
            Tuple of (allowed: bool, message: str)
        """
        if role == "admin":
            return True, f"Admin has access to {resource}.{action}"

        if resource not in cls.PERMISSIONS:
            return False, f"Unknown resource: {resource}"

        if action not in cls.PERMISSIONS[resource]:
            return False, f"Unknown action: {action} for resource {resource}"

        allowed_roles = cls.PERMISSIONS[resource][action]
        if role not in allowed_roles:
            allowed_roles_str = ", ".join(allowed_roles)
            return (
                False,
                f"Role '{role}' not allowed to {action} {resource}. "
                f"Allowed roles: {allowed_roles_str}",
            )

        return True, f"Role '{role}' allowed to {action} {resource}"


# Singleton instance for easy access
permission_matrix = PermissionMatrix()