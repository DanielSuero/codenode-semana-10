'use client';

import { useState } from 'react';
import styles from './RevisionForm.module.css';

interface RevisionItemInput {
  category: string;
  name: string;
  status: 'Passed' | 'Warning' | 'Failed' | 'Pending';
  value: string;
  notes: string;
}

interface RevisionFormProps {
  carMileage: number;
  initialRevision?: any; // If editing, we pass the existing revision
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_CHECKLIST: RevisionItemInput[] = [
  // Engine
  { category: 'Engine', name: 'Nivel de Aceite (Oil Level)', status: 'Pending', value: '', notes: '' },
  { category: 'Engine', name: 'Líquido Refrigerante (Coolant)', status: 'Pending', value: '', notes: '' },
  { category: 'Engine', name: 'Filtro de Aceite (Oil Filter)', status: 'Pending', value: '', notes: '' },
  { category: 'Engine', name: 'Filtro de Aire (Air Filter)', status: 'Pending', value: '', notes: '' },
  { category: 'Engine', name: 'Correa de Accesorios (Accessory Belt)', status: 'Pending', value: '', notes: '' },
  // Tires & Brakes
  { category: 'Tires & Brakes', name: 'Presión Neumáticos (Tire Pressure)', status: 'Pending', value: '', notes: '' },
  { category: 'Tires & Brakes', name: 'Profundidad de Neumáticos (Tread Depth)', status: 'Pending', value: '', notes: '' },
  { category: 'Tires & Brakes', name: 'Pastillas de Freno (Brake Pads)', status: 'Pending', value: '', notes: '' },
  { category: 'Tires & Brakes', name: 'Líquido de Frenos (Brake Fluid)', status: 'Pending', value: '', notes: '' },
  // Electronics
  { category: 'Electronics', name: 'Luces Principales (Headlights)', status: 'Pending', value: '', notes: '' },
  { category: 'Electronics', name: 'Intermitentes y Alertas (Turn Signals & Hazards)', status: 'Pending', value: '', notes: '' },
  { category: 'Electronics', name: 'Batería (Battery Voltage)', status: 'Pending', value: '', notes: '' },
  // Safety & Body
  { category: 'Safety & Body', name: 'Limpiaparabrisas (Wipers)', status: 'Pending', value: '', notes: '' },
  { category: 'Safety & Body', name: 'Cinturones de Seguridad (Seatbelts)', status: 'Pending', value: '', notes: '' },
  { category: 'Safety & Body', name: 'Estado del Parabrisas (Windshield)', status: 'Pending', value: '', notes: '' },
];

export default function RevisionForm({ carMileage, initialRevision, onSave, onCancel }: RevisionFormProps) {
  const isEditing = !!initialRevision;

  const [date, setDate] = useState(
    initialRevision ? initialRevision.date : new Date().toISOString().split('T')[0]
  );
  const [mileage, setMileage] = useState<number>(
    initialRevision ? initialRevision.mileage : carMileage
  );
  const [inspectorName, setInspectorName] = useState(
    initialRevision ? initialRevision.inspector_name : ''
  );
  const [generalNotes, setGeneralNotes] = useState(
    initialRevision ? initialRevision.notes || '' : ''
  );
  
  // Load initial items or defaults
  const [items, setItems] = useState<RevisionItemInput[]>(() => {
    if (initialRevision && initialRevision.items) {
      return initialRevision.items.map((item: any) => ({
        category: item.category,
        name: item.name,
        status: item.status,
        value: item.value || '',
        notes: item.notes || '',
      }));
    }
    return DEFAULT_CHECKLIST;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = (index: number, newStatus: 'Passed' | 'Warning' | 'Failed' | 'Pending') => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  const handleItemValueChange = (index: number, val: string) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], value: val };
      return updated;
    });
  };

  const handleItemNotesChange = (index: number, note: string) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], notes: note };
      return updated;
    });
  };

  const getOverallStatus = (): 'Passed' | 'Conditional' | 'Failed' => {
    const hasFailed = items.some((item) => item.status === 'Failed');
    if (hasFailed) return 'Failed';
    const hasWarning = items.some((item) => item.status === 'Warning');
    if (hasWarning) return 'Conditional';
    return 'Passed';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (!inspectorName.trim()) {
      setError('Por favor, indica el nombre del inspector/operario.');
      setIsSubmitting(false);
      return;
    }

    if (mileage < 0) {
      setError('El kilometraje debe ser mayor o igual a cero.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      date,
      mileage,
      inspector_name: inspectorName,
      notes: generalNotes,
      status: getOverallStatus(),
      items: items,
    };

    try {
      const url = isEditing ? `/api/revisions/${initialRevision.id}` : '/api/revisions';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al guardar la revisión.');
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Error de red.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group items by category
  const categories = ['Engine', 'Tires & Brakes', 'Electronics', 'Safety & Body'];

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h2 className={styles.title}>
        {isEditing ? `Editar Registro de Revisión #${initialRevision.id.substring(4)}` : 'Nueva Inspección de Vehículo'}
      </h2>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <div className={styles.metaGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Kilometraje en la Inspección (km)</label>
          <input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Inspector / Técnico</label>
          <input
            type="text"
            placeholder="Nombre completo"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            required
            className={styles.input}
          />
        </div>
      </div>

      {categories.map((cat) => {
        // Find indexes of items belonging to this category
        const catItems = items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => item.category === cat);

        return (
          <div key={cat} className={styles.categorySection}>
            <h3 className={styles.categoryTitle}>
              {cat === 'Engine' && '⚙️ Motor y Mecánica'}
              {cat === 'Tires & Brakes' && '🚗 Ruedas y Frenos'}
              {cat === 'Electronics' && '⚡ Sistemas Eléctricos'}
              {cat === 'Safety & Body' && '🛡️ Seguridad y Chasis'}
            </h3>

            <div className={styles.itemsContainer}>
              {catItems.map(({ item, idx }) => (
                <div key={idx} className={styles.itemCard}>
                  <div className={styles.itemName}>{item.name}</div>
                  
                  <div className={styles.statusOptions}>
                    {(['Passed', 'Warning', 'Failed', 'Pending'] as const).map((st) => {
                      let activeClass = '';
                      if (item.status === st) {
                        if (st === 'Passed') activeClass = styles.statusPassed;
                        if (st === 'Warning') activeClass = styles.statusWarning;
                        if (st === 'Failed') activeClass = styles.statusFailed;
                        if (st === 'Pending') activeClass = styles.statusPending;
                      }
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(idx, st)}
                          className={`${styles.statusButton} ${activeClass} ${item.status === st ? styles.active : ''}`}
                        >
                          {st === 'Passed' && 'Correcto'}
                          {st === 'Warning' && 'Aviso'}
                          {st === 'Failed' && 'Fallo'}
                          {st === 'Pending' && 'Pendiente'}
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.itemInputs}>
                    <input
                      type="text"
                      placeholder="Medida/Valor (e.g. 5mm, 12V)"
                      value={item.value}
                      onChange={(e) => handleItemValueChange(idx, e.target.value)}
                      className={styles.input}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    />
                    <textarea
                      placeholder="Notas del estado..."
                      value={item.notes}
                      onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                      className={styles.textarea}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className={styles.generalNotes}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Notas Generales / Diagnóstico Final</label>
          <textarea
            placeholder="Escribe un resumen o detalles adicionales importantes de la revisión..."
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            className={styles.textarea}
            style={{ minHeight: '100px' }}
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
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
          {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Revisión'}
        </button>
      </div>
    </form>
  );
}
