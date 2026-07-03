'use client';

import { useState } from 'react';
import styles from './CarHeader.module.css';

interface CarProfile {
  id: number;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  mileage: number;
  last_revision_date: string | null;
}

interface CarHeaderProps {
  car: CarProfile;
  onUpdate: () => void;
}

export default function CarHeader({ car, onUpdate }: CarHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    make: car.make,
    model: car.model,
    year: car.year,
    license_plate: car.license_plate,
    vin: car.vin || '',
    mileage: car.mileage,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' || name === 'mileage' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/car', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update car details');
      }

      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing) {
    return (
      <div className={styles.headerContainer}>
        <form onSubmit={handleSubmit} className={styles.form}>
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
            <input
              type="text"
              name="make"
              value={formData.make}
              onChange={handleInputChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Modelo</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Año</label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Matrícula (License Plate)</label>
            <input
              type="text"
              name="license_plate"
              value={formData.license_plate}
              onChange={handleInputChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Kilometraje (km)</label>
            <input
              type="number"
              name="mileage"
              value={formData.mileage}
              onChange={handleInputChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Nº Bastidor (VIN)</label>
            <input
              type="text"
              name="vin"
              value={formData.vin}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className={styles.btnSecondary}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.headerContainer}>
      <div className={styles.carDetails}>
        <span className={styles.badge}>Vehículo en Seguimiento</span>
        <div className={styles.titleRow}>
          <h1 className={styles.carName}>
            {car.make} {car.model}
          </h1>
          <span className={styles.carYear}>{car.year}</span>
        </div>
        
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
        <button
          onClick={() => setIsEditing(true)}
          className={styles.btnSecondary}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Editar Ficha
        </button>
      </div>
    </div>
  );
}
