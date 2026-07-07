'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import CarHeader from '@/components/CarHeader';
import DashboardCharts from '@/components/DashboardCharts';
import RevisionTimeline from '@/components/RevisionTimeline';
import RevisionForm from '@/components/RevisionForm';

export default function Home() {
  const [car, setCar] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Revision Form view state
  const [isEditing, setIsEditing] = useState(false);
  const [editingRevision, setEditingRevision] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch car details
      const carResponse = await fetch('/api/car');
      if (!carResponse.ok) {
        throw new Error('Error al cargar la ficha del coche.');
      }
      const carData = await carResponse.json();
      setCar(carData);

      // Fetch revision history
      const revResponse = await fetch('/api/revisions');
      if (!revResponse.ok) {
        throw new Error('Error al cargar el historial de revisiones.');
      }
      const revData = await revResponse.json();
      setRevisions(revData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Error de red.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartNewRevision = () => {
    setEditingRevision(null);
    setIsEditing(true);
  };

  const handleEditRevision = (revision: any) => {
    setEditingRevision(revision);
    setIsEditing(true);
  };

  const handleSaveRevision = () => {
    setIsEditing(false);
    setEditingRevision(null);
    fetchData();
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingRevision(null);
  };

  if (loading && !car) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner} />
          <p>Cargando panel de control...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <h2 style={{ color: 'var(--status-failed)', marginBottom: '1rem' }}>⚠️ Error en la Aplicación</h2>
          <p style={{ color: 'var(--fg-secondary)', marginBottom: '2rem' }}>{error}</p>
          <button onClick={fetchData} className={styles.btnNewRevision} style={{ margin: '0 auto' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header style={{ marginBottom: '1rem' }}>
        {car && <CarHeader car={car} onUpdate={fetchData} />}
      </header>

      <main className={styles.main}>
        {isEditing ? (
          <RevisionForm
            carMileage={car?.mileage || 0}
            initialRevision={editingRevision}
            onSave={handleSaveRevision}
            onCancel={handleCancelForm}
          />
        ) : (
          <>
            {/* Charts View */}
            <DashboardCharts revisions={revisions} />

            {/* List & Timeline View Header */}
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Historial de Revisiones
              </h2>
              <button onClick={handleStartNewRevision} className={styles.btnNewRevision}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Nueva Revisión
              </button>
            </div>

            {/* Revision Timeline */}
            <RevisionTimeline
              revisions={revisions}
              onEdit={handleEditRevision}
              onRefresh={fetchData}
            />
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Control de Inspecciones y Revisiones de Vehículo Técnico • Realizado con Next.js & SQLite</p>
      </footer>
    </div>
  );
}
