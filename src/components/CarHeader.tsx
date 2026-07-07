'use client';

import { useEffect, useState } from 'react';
import styles from './CarHeader.module.css';

interface CarProfile {
  id: number;
  make: string;
  model: string;
  engine: string | null;
  year: number;
  license_plate: string;
  vin: string;
  mileage: number;
  last_revision_date: string | null;
  is_active?: number;
}

interface CarHeaderProps {
  car: CarProfile;
  onUpdate: () => void;
}

const EMPTY_CAR_FORM = {
  make: '',
  model: '',
  engine: '',
  year: new Date().getFullYear(),
  license_plate: '',
  vin: '',
  mileage: 0,
};

export default function CarHeader({ car, onUpdate }: CarHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    make: car.make,
    model: car.model,
    engine: car.engine || '',
    year: car.year,
    license_plate: car.license_plate,
    vin: car.vin || '',
    mileage: car.mileage,
  });

  const [isChangingCar, setIsChangingCar] = useState(false);
  const [newCarData, setNewCarData] = useState(EMPTY_CAR_FORM);
  const [savedCars, setSavedCars] = useState<CarProfile[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSavedCars = async () => {
    try {
      const res = await fetch('/api/car?all=1');
      if (!res.ok) return;
      const data = await res.json();
      setSavedCars(Array.isArray(data) ? data : []);
    } catch {
      setSavedCars([]);
    }
  };

  useEffect(() => {
    void refreshSavedCars();
  }, [car.id]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: name === 'year' || name === 'mileage' ? parseInt(value) || 0 : value,
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/car', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar los cambios.');
      }

      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewCarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCarData((prev) => ({
      ...prev,
      [name]: name === 'year' || name === 'mileage' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSwitchToCar = async (targetCarId: number) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/car/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ car_id: targetCarId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cambiar de vehículo.');
      }

      setIsChangingCar(false);
      await refreshSavedCars();
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/car/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCarData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cambiar el vehículo.');
      }

      setIsChangingCar(false);
      setNewCarData(EMPTY_CAR_FORM);
      await refreshSavedCars();
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing) {
    return (
      <div className={styles.headerContainer}>
        <form onSubmit={handleEditSubmit} className={styles.form}>
          <h2 style={{ gridColumn: 'span 2', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Editar Detalles del Vehículo
          </h2>

          {error && (
            <div style={{ gridColumn: 'span 2', color: 'var(--status-failed)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Marca</label>
            <input type="text" name="make" value={editData.make} onChange={handleEditChange} required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Modelo</label>
            <input type="text" name="model" value={editData.model} onChange={handleEditChange} required className={styles.input} />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.label}>Motor (e.g. 2.0 TDI 150 CV, 3.0 T Biturbo 450 CV)</label>
            <input type="text" name="engine" value={editData.engine} onChange={handleEditChange} placeholder="Especificación del motor" className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Año</label>
            <input type="number" name="year" value={editData.year} onChange={handleEditChange} required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Matrícula</label>
            <input type="text" name="license_plate" value={editData.license_plate} onChange={handleEditChange} required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Kilometraje (km)</label>
            <input type="number" name="mileage" value={editData.mileage} onChange={handleEditChange} required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Nº Bastidor (VIN)</label>
            <input type="text" name="vin" value={editData.vin} onChange={handleEditChange} className={styles.input} />
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={() => { setIsEditing(false); setError(null); }} className={styles.btnSecondary} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      {isChangingCar && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setIsChangingCar(false); setError(null); } }}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>🚗 Cambiar Vehículo</h2>

            <div className={styles.modalWarning}>
              ⚠️ <strong>Atención:</strong> Se creará un nuevo vehículo y se activará para este panel. El anterior quedará guardado y podrás volver a usarlo más tarde.
            </div>

            {error && (
              <div style={{ color: 'var(--status-failed)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {savedCars.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>Vehículos guardados</div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {savedCars.map((savedCar) => (
                    <button
                      key={savedCar.id}
                      type="button"
                      onClick={() => void handleSwitchToCar(savedCar.id)}
                      className={styles.btnSecondary}
                      style={{ justifyContent: 'space-between', width: '100%' }}
                      disabled={isSubmitting}
                    >
                      <span>{savedCar.make} {savedCar.model}</span>
                      <span style={{ opacity: 0.7 }}>{savedCar.license_plate}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleChangeCarSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Marca *</label>
                <input type="text" name="make" value={newCarData.make} onChange={handleNewCarChange} required placeholder="Ej. Toyota, BMW..." className={styles.input} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Modelo *</label>
                <input type="text" name="model" value={newCarData.model} onChange={handleNewCarChange} required placeholder="Ej. GR86, Serie 3..." className={styles.input} />
              </div>

              <div className={styles.modalFormFull}>
                <label className={styles.label}>Motor</label>
                <input type="text" name="engine" value={newCarData.engine} onChange={handleNewCarChange} placeholder="Ej. 2.0 GR-Sport 234 CV, 2.0d 190 CV..." className={styles.input} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Año *</label>
                <input type="number" name="year" value={newCarData.year} onChange={handleNewCarChange} required min={1886} max={new Date().getFullYear() + 2} className={styles.input} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Matrícula *</label>
                <input type="text" name="license_plate" value={newCarData.license_plate} onChange={handleNewCarChange} required placeholder="Ej. 1234 ABC" className={styles.input} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Kilometraje inicial (km) *</label>
                <input type="number" name="mileage" value={newCarData.mileage} onChange={handleNewCarChange} required min={0} className={styles.input} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nº Bastidor (VIN)</label>
                <input type="text" name="vin" value={newCarData.vin} onChange={handleNewCarChange} placeholder="Opcional" className={styles.input} />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => { setIsChangingCar(false); setError(null); setNewCarData(EMPTY_CAR_FORM); }} className={styles.btnSecondary} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? 'Cambiando...' : 'Confirmar Cambio de Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.headerContainer}>
        <div className={styles.carDetails}>
          <span className={styles.badge}>Vehículo en Seguimiento</span>
          <div className={styles.titleRow}>
            <h1 className={styles.carName}>
              {car.make} {car.model}
            </h1>
            <span className={styles.carYear}>{car.year}</span>
          </div>

          {car.engine && (
            <div style={{ marginTop: '0.35rem', marginBottom: '0.25rem', color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.95rem' }}>
              ⚙️ {car.engine}
            </div>
          )}

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Matrícula</span>
              <span className={styles.metaValue}>{car.license_plate}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Nº Bastidor (VIN)</span>
              <span className={styles.metaValue}>{car.vin || 'N/A'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Kilometraje Total</span>
              <span className={styles.metaValue}>{car.mileage.toLocaleString()} km</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Última Revisión</span>
              <span className={styles.metaValue}>{car.last_revision_date || 'Ninguna'}</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={() => { setEditData({ make: car.make, model: car.model, engine: car.engine || '', year: car.year, license_plate: car.license_plate, vin: car.vin || '', mileage: car.mileage }); setIsEditing(true); }} className={styles.btnSecondary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Editar Ficha
          </button>

          <button onClick={() => { setIsChangingCar(true); setError(null); void refreshSavedCars(); }} className={styles.btnDanger}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v7Z" />
              <path d="M17 21v-4H7v4" />
              <path d="M9 3v5H5" />
            </svg>
            Cambiar Vehículo
          </button>
        </div>
      </div>
    </>
  );
}
