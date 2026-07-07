'use client';

import { useState } from 'react';
import styles from './RevisionTimeline.module.css';

interface RevisionTimelineProps {
  revisions: any[];
  onEdit: (revision: any) => void;
  onRefresh: () => void;
}

export default function RevisionTimeline({ revisions, onEdit, onRefresh }: RevisionTimelineProps) {
  const [expandedRevisionId, setExpandedRevisionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRevisionId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro de revisión? Esto no se puede deshacer.')) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/revisions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error deleting revision');
      }

      onRefresh();
    } catch (error) {
      console.error('Failed to delete revision:', error);
      alert('Hubo un error al intentar eliminar la revisión.');
    } finally {
      setDeletingId(null);
    }
  };

  if (revisions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3 className={styles.emptyTitle}>Sin Historial de Revisiones</h3>
        <p>Aún no se ha registrado ninguna revisión para este vehículo. Comienza creando una nueva inspección.</p>
      </div>
    );
  }

  return (
    <div className={styles.timelineContainer}>
      {revisions.map((rev) => {
        const isExpanded = expandedRevisionId === rev.id;
        const totalItemsCount = rev.items?.length || 0;
        const failedItemsCount = rev.items?.filter((item: any) => item.status === 'Failed').length || 0;
        const warningItemsCount = rev.items?.filter((item: any) => item.status === 'Warning').length || 0;

        let badgeClass = styles.badgePassed;
        let badgeLabel = 'Aprobado';
        if (rev.status === 'Failed') {
          badgeClass = styles.badgeFailed;
          badgeLabel = 'No Apto / Fallos';
        } else if (rev.status === 'Conditional') {
          badgeClass = styles.badgeConditional;
          badgeLabel = 'Aprobado con Avisos';
        }

        return (
          <div key={rev.id} className={styles.timelineCard}>
            <div className={styles.cardHeader}>
              <div className={styles.titleGroup}>
                <span className={styles.date}>{rev.date}</span>
                <span className={`${styles.badge} ${badgeClass}`}>{badgeLabel}</span>
              </div>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  Kilometraje: <strong>{rev.mileage.toLocaleString()} km</strong>
                </div>
                <div className={styles.metaItem}>
                  Inspector: <strong>{rev.inspector_name}</strong>
                </div>
              </div>
            </div>

            {rev.notes && <div className={styles.notes}>{rev.notes}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => toggleExpand(rev.id)} className={styles.expandButton}>
                {isExpanded ? 'Ocultar Detalles' : 'Ver Detalles de la Inspección'}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                {failedItemsCount > 0 && (
                  <span style={{ color: 'var(--status-failed)', marginRight: '0.75rem', fontWeight: 600 }}>
                    ⚠️ {failedItemsCount} Fallos
                  </span>
                )}
                {warningItemsCount > 0 && (
                  <span style={{ color: 'var(--status-warning)', fontWeight: 600 }}>
                    ⚡ {warningItemsCount} Avisos
                  </span>
                )}
                {failedItemsCount === 0 && warningItemsCount === 0 && (
                  <span style={{ color: 'var(--status-passed)', fontWeight: 600 }}>
                    ✓ Todo Correcto
                  </span>
                )}
              </div>
            </div>

            {isExpanded && rev.items && (
              <div className={styles.itemsDrawer}>
                <h4 className={styles.drawerTitle}>Detalle de Puntos Revisados ({totalItemsCount})</h4>
                <div className={styles.itemsGrid}>
                  {rev.items.map((item: any) => {
                    let dotClass = styles.dotPending;
                    let statusLabel = 'Pendiente';

                    if (item.status === 'Passed') {
                      dotClass = styles.dotPassed;
                      statusLabel = 'Correcto';
                    } else if (item.status === 'Warning') {
                      dotClass = styles.dotWarning;
                      statusLabel = 'Aviso';
                    } else if (item.status === 'Failed') {
                      dotClass = styles.dotFailed;
                      statusLabel = 'Fallo';
                    }

                    return (
                      <div key={item.id} className={styles.itemStatusRow}>
                        <div className={styles.itemMeta}>
                          <span className={styles.itemName}>{item.name}</span>
                          {(item.value || item.notes) && (
                            <span className={styles.itemSubtext}>
                              {item.value && <span>Medida: {item.value}</span>}
                              {item.value && item.notes && <span> | </span>}
                              {item.notes && <span>{item.notes}</span>}
                            </span>
                          )}
                        </div>

                        <div className={styles.statusIndicator}>
                          <span className={`${styles.dot} ${dotClass}`} />
                          <span
                            style={{
                              color:
                                item.status === 'Passed'
                                  ? 'var(--status-passed)'
                                  : item.status === 'Warning'
                                  ? 'var(--status-warning)'
                                  : item.status === 'Failed'
                                  ? 'var(--status-failed)'
                                  : 'var(--fg-muted)',
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.cardActions}>
              <button onClick={() => onEdit(rev)} className={styles.btnEdit} disabled={deletingId === rev.id}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Editar
              </button>
              <button
                onClick={() => handleDelete(rev.id)}
                className={styles.btnDelete}
                disabled={deletingId === rev.id}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                {deletingId === rev.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
