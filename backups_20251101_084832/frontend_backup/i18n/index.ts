// Internationalization system for STS Clearance Hub
export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ar' | 'zh' | 'ja';

export interface TranslationEntry {
  [key: string]: string;
}

export interface Translations {
  [key: string]: TranslationEntry;
}

const translations: Translations = {
  // Navigation
  'nav.overview': {
    en: 'Overview',
    es: 'Resumen',
    fr: 'Aperçu',
    de: 'Übersicht',
    pt: 'Visão Geral',
    ar: 'نظرة عامة',
    zh: '概览',
    ja: '概要'
  },
  'nav.documents': {
    en: 'Document Status',
    es: 'Estado de Documentos',
    fr: 'Statut des Documents',
    de: 'Dokumentstatus',
    pt: 'Status dos Documentos',
    ar: 'حالة الوثائق',
    zh: '文档状态',
    ja: '書類ステータス'
  },
  'nav.approval': {
    en: 'Approval Matrix',
    es: 'Matriz de Aprobación',
    fr: 'Matrice d\'Approbation',
    de: 'Genehmigungsmatrix',
    pt: 'Matriz de Aprovação',
    ar: 'مصفوفة الموافقة',
    zh: '批准矩阵',
    ja: '承認マトリックス'
  },
  'nav.activity': {
    en: 'Activity Feed',
    es: 'Feed de Actividad',
    fr: 'Flux d\'Activité',
    de: 'Aktivitätsfeed',
    pt: 'Feed de Atividade',
    ar: 'تغذية النشاط',
    zh: '活动信息流',
    ja: 'アクティビティフィード'
  },
  'nav.history': {
    en: 'History',
    es: 'Historial',
    fr: 'Historique',
    de: 'Verlauf',
    pt: 'Histórico',
    ar: 'التاريخ',
    zh: '历史',
    ja: '履歴'
  },
  'nav.messages': {
    en: 'Messages',
    es: 'Mensajes',
    fr: 'Messages',
    de: 'Nachrichten',
    pt: 'Mensagens',
    ar: 'الرسائل',
    zh: '消息',
    ja: 'メッセージ'
  },

  // Common actions
  'action.upload': {
    en: 'Upload',
    es: 'Cargar',
    fr: 'Télécharger',
    de: 'Hochladen',
    pt: 'Enviar',
    ar: 'تحميل',
    zh: '上传',
    ja: 'アップロード'
  },
  'action.download': {
    en: 'Download',
    es: 'Descargar',
    fr: 'Télécharger',
    de: 'Herunterladen',
    pt: 'Baixar',
    ar: 'تنزيل',
    zh: '下载',
    ja: 'ダウンロード'
  },
  'action.approve': {
    en: 'Approve',
    es: 'Aprobar',
    fr: 'Approuver',
    de: 'Genehmigen',
    pt: 'Aprovar',
    ar: 'موافقة',
    zh: '批准',
    ja: '承認'
  },
  'action.reject': {
    en: 'Reject',
    es: 'Rechazar',
    fr: 'Rejeter',
    de: 'Ablehnen',
    pt: 'Rejeitar',
    ar: 'رفض',
    zh: '拒绝',
    ja: '拒否'
  },
  'action.refresh': {
    en: 'Refresh',
    es: 'Actualizar',
    fr: 'Actualiser',
    de: 'Aktualisieren',
    pt: 'Atualizar',
    ar: 'تحديث',
    zh: '刷新',
    ja: '更新'
  },
  'action.generate_pdf': {
    en: 'Generate PDF',
    es: 'Generar PDF',
    fr: 'Générer PDF',
    de: 'PDF erstellen',
    pt: 'Gerar PDF',
    ar: 'إنشاء PDF',
    zh: '生成PDF',
    ja: 'PDF生成'
  },

  // Document status
  'status.missing': {
    en: 'Missing',
    es: 'Faltante',
    fr: 'Manquant',
    de: 'Fehlend',
    pt: 'Em Falta',
    ar: 'مفقود',
    zh: '缺失',
    ja: '不足'
  },
  'status.under_review': {
    en: 'Under Review',
    es: 'En Revisión',
    fr: 'En Cours d\'Examen',
    de: 'In Überprüfung',
    pt: 'Em Análise',
    ar: 'قيد المراجعة',
    zh: '审核中',
    ja: '審査中'
  },
  'status.approved': {
    en: 'Approved',
    es: 'Aprobado',
    fr: 'Approuvé',
    de: 'Genehmigt',
    pt: 'Aprovado',
    ar: 'معتمد',
    zh: '已批准',
    ja: '承認済み'
  },
  'status.expired': {
    en: 'Expired',
    es: 'Expirado',
    fr: 'Expiré',
    de: 'Abgelaufen',
    pt: 'Expirado',
    ar: 'منتهي الصلاحية',
    zh: '已过期',
    ja: '期限切れ'
  },
  'status.pending': {
    en: 'Pending',
    es: 'Pendiente',
    fr: 'En Attente',
    de: 'Ausstehend',
    pt: 'Pendente',
    ar: 'معلق',
    zh: '待处理',
    ja: '保留中'
  },

  // Criticality levels
  'criticality.high': {
    en: 'High',
    es: 'Alta',
    fr: 'Élevée',
    de: 'Hoch',
    pt: 'Alta',
    ar: 'عالية',
    zh: '高',
    ja: '高'
  },
  'criticality.med': {
    en: 'Medium',
    es: 'Media',
    fr: 'Moyenne',
    de: 'Mittel',
    pt: 'Média',
    ar: 'متوسطة',
    zh: '中',
    ja: '中'
  },
  'criticality.low': {
    en: 'Low',
    es: 'Baja',
    fr: 'Faible',
    de: 'Niedrig',
    pt: 'Baixa',
    ar: 'منخفضة',
    zh: '低',
    ja: '低'
  },

  // Overview page
  'overview.progress': {
    en: 'Overall Progress',
    es: 'Progreso General',
    fr: 'Progrès Global',
    de: 'Gesamtfortschritt',
    pt: 'Progresso Geral',
    ar: 'التقدم العام',
    zh: '总体进度',
    ja: '全体の進捗'
  },
  'overview.blockers': {
    en: 'Critical Blockers',
    es: 'Bloqueadores Críticos',
    fr: 'Bloqueurs Critiques',
    de: 'Kritische Blocker',
    pt: 'Bloqueadores Críticos',
    ar: 'الحواجز الحرجة',
    zh: '关键阻滞',
    ja: '重要なブロッカー'
  },
  'overview.expiring': {
    en: 'Expiring Soon',
    es: 'Expirando Pronto',
    fr: 'Expire Bientôt',
    de: 'Läuft bald ab',
    pt: 'Expirando em Breve',
    ar: 'تنتهي قريباً',
    zh: '即将过期',
    ja: 'まもなく期限切れ'
  },

  // Document types
  'doc.insurance': {
    en: 'Insurance Certificate',
    es: 'Certificado de Seguro',
    fr: 'Certificat d\'Assurance',
    de: 'Versicherungszertifikat',
    pt: 'Certificado de Seguro',
    ar: 'شهادة التأمين',
    zh: '保险证书',
    ja: '保険証明書'
  },
  'doc.compatibility': {
    en: 'Compatibility Study',
    es: 'Estudio de Compatibilidad',
    fr: 'Étude de Compatibilité',
    de: 'Kompatibilitätsstudie',
    pt: 'Estudo de Compatibilidade',
    ar: 'دراسة التوافق',
    zh: '兼容性研究',
    ja: '互換性研究'
  },
  'doc.risk_assessment': {
    en: 'Risk Assessment',
    es: 'Evaluación de Riesgos',
    fr: 'Évaluation des Risques',
    de: 'Risikobewertung',
    pt: 'Avaliação de Risco',
    ar: 'تقييم المخاطر',
    zh: '风险评估',
    ja: 'リスク評価'
  },
  'doc.fender_certificates': {
    en: 'Fender Certificates',
    es: 'Certificados de Defensas',
    fr: 'Certificats de Pare-battages',
    de: 'Fender-Zertifikate',
    pt: 'Certificados de Para-choque',
    ar: 'شهادات الواقي',
    zh: '护舷证书',
    ja: 'フェンダー証明書'
  },

  // Error messages
  'error.upload_failed': {
    en: 'Failed to upload document',
    es: 'Error al cargar documento',
    fr: 'Échec du téléchargement du document',
    de: 'Dokumentupload fehlgeschlagen',
    pt: 'Falha ao carregar documento',
    ar: 'فشل في تحميل الوثيقة',
    zh: '文档上传失败',
    ja: '書類のアップロードに失敗'
  },
  'error.load_failed': {
    en: 'Failed to load data',
    es: 'Error al cargar datos',
    fr: 'Échec du chargement des données',
    de: 'Daten laden fehlgeschlagen',
    pt: 'Falha ao carregar dados',
    ar: 'فشل في تحميل البيانات',
    zh: '数据加载失败',
    ja: 'データの読み込みに失敗'
  },
  'error.network_error': {
    en: 'Network error',
    es: 'Error de red',
    fr: 'Erreur réseau',
    de: 'Netzwerkfehler',
    pt: 'Erro de rede',
    ar: 'خطأ في الشبكة',
    zh: '网络错误',
    ja: 'ネットワークエラー'
  },

  // Success messages
  'success.upload': {
    en: 'Document uploaded successfully',
    es: 'Documento cargado exitosamente',
    fr: 'Document téléchargé avec succès',
    de: 'Dokument erfolgreich hochgeladen',
    pt: 'Documento enviado com sucesso',
    ar: 'تم تحميل الوثيقة بنجاح',
    zh: '文档上传成功',
    ja: '書類のアップロードが完了'
  },
  'success.approve': {
    en: 'Document approved successfully',
    es: 'Documento aprobado exitosamente',
    fr: 'Document approuvé avec succès',
    de: 'Dokument erfolgreich genehmigt',
    pt: 'Documento aprovado com sucesso',
    ar: 'تمت الموافقة على الوثيقة بنجاح',
    zh: '文档批准成功',
    ja: '書類の承認が完了'
  },
  'success.reject': {
    en: 'Document rejected successfully',
    es: 'Documento rechazado exitosamente',
    fr: 'Document rejeté avec succès',
    de: 'Dokument erfolgreich abgelehnt',
    pt: 'Documento rejeitado com sucesso',
    ar: 'تم رفض الوثيقة بنجاح',
    zh: '文档拒绝成功',
    ja: '書類の拒否が完了'
  }
};

export function useTranslation() {
  const getTranslation = (key: string, language: Language = 'en'): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return translation[language] || translation.en || key;
  };

  return { t: getTranslation };
}

export function getTranslation(key: string, language: Language = 'en'): string {
  const translation = translations[key];
  if (!translation) {
    return key;
  }
  return translation[language] || translation.en || key;
}

export const availableLanguages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' }
];