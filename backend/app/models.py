"""
Main models module for STS Clearance Hub.

This module consolidates all model imports to ensure a single SQLAlchemy registry.
All models are defined in the models/ package and re-exported here.
"""

# Import all models from the models package directly
import os
import sys

# Get the models package directory
models_pkg_dir = os.path.join(os.path.dirname(__file__), 'models')

# Load the models package __init__.py directly
import importlib.util
spec = importlib.util.spec_from_file_location(
    "app._models_internal",  # Use different name to avoid conflicts
    os.path.join(models_pkg_dir, '__init__.py')
)
_models_internal = importlib.util.module_from_spec(spec)

# Execute the module to define all classes
spec.loader.exec_module(_models_internal)

# Re-export everything
Base = _models_internal.Base
User = _models_internal.User
Room = _models_internal.Room
Party = _models_internal.Party
DocumentType = _models_internal.DocumentType
Document = _models_internal.Document
DocumentVersion = _models_internal.DocumentVersion
Approval = _models_internal.Approval
ActivityLog = _models_internal.ActivityLog
FeatureFlag = _models_internal.FeatureFlag
Message = _models_internal.Message
Notification = _models_internal.Notification
Vessel = _models_internal.Vessel
Snapshot = _models_internal.Snapshot
VesselPair = _models_internal.VesselPair
Metric = _models_internal.Metric
PartyMetric = _models_internal.PartyMetric
Approval = _models_internal.Approval
StsOperationSession = _models_internal.StsOperationSession
OperationParticipant = _models_internal.OperationParticipant
OperationVessel = _models_internal.OperationVessel
StsOperationCode = _models_internal.StsOperationCode
LoginHistory = _models_internal.LoginHistory
BackupSchedule = _models_internal.BackupSchedule
BackupMetadata = _models_internal.BackupMetadata

__all__ = [
    'Base',
    'User',
    'Room',
    'Party',
    'DocumentType',
    'Document',
    'DocumentVersion',
    'Approval',
    'ActivityLog',
    'FeatureFlag',
    'Message',
    'Notification',
    'Vessel',
    'Snapshot',
    'VesselPair',
    'Metric',
    'PartyMetric',
    'StsOperationSession',
    'OperationParticipant',
    'OperationVessel',
    'StsOperationCode',
    'LoginHistory',
    'BackupSchedule',
    'BackupMetadata',
]