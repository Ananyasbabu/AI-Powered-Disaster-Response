import { useState } from 'react';
import API from '../api/axios';

function formatPostTime(dateString) {
  if (!dateString) return 'Not available';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getNumber(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

export default function ShelterCard({
  shelter,
  isSelected,
  onSelect,
  onBedsChanged,
}) {
  const [updatingBeds, setUpdatingBeds] = useState(false);

  const hasImage = Boolean(shelter.image_url);
  const imageUrl = hasImage
    ? `http://localhost:5000/${shelter.image_url}`
    : null;

  const hasBedData =
    shelter.total_beds !== null &&
    shelter.total_beds !== undefined &&
    getNumber(shelter.total_beds, 0) > 0;

  const totalBeds = hasBedData ? getNumber(shelter.total_beds) : 0;

  const availableBeds = hasBedData
    ? Math.min(
        totalBeds,
        Math.max(
          0,
          shelter.available_beds !== null &&
            shelter.available_beds !== undefined
            ? getNumber(shelter.available_beds)
            : totalBeds - getNumber(shelter.occupied_beds)
        )
      )
    : 0;

  const updateBeds = async (action, event) => {
    event.stopPropagation();

    if (!shelter.is_admin) {
      alert('Bed management is available only for registered shelters.');
      return;
    }

    setUpdatingBeds(true);

    try {
      const response = await API.patch(`/shelters/${shelter.id}/beds`, {
        action,
      });

      if (onBedsChanged) {
        onBedsChanged(response.data.data);
      }
    } catch (error) {
      console.error('Bed update failed:', error);
      alert(error.response?.data?.message || 'Unable to update beds.');
    } finally {
      setUpdatingBeds(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(shelter)}
      style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        border: isSelected ? '2px solid #3b82f6' : '1px solid #334155',
        boxShadow: isSelected
          ? '0 0 12px rgba(59, 130, 246, 0.4)'
          : '0 4px 6px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '140px',
          marginBottom: '12px',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {hasImage ? (
          <img
            src={imageUrl}
            alt={shelter.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
            }}
          >
            📷 No Image Uploaded
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#f8fafc',
            }}
          >
            {shelter.name}
          </h3>

          <span
            style={{
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '4px',
              backgroundColor:
                shelter.is_safe !== false
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(244, 63, 94, 0.2)',
              color: shelter.is_safe !== false ? '#34d399' : '#f87171',
            }}
          >
            {shelter.is_safe !== false ? 'Safe' : 'Unsafe'}
          </span>
        </div>

        <p
          style={{
            margin: '0 0 5px',
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}
        >
          📍 <strong style={{ color: '#e2e8f0' }}>
            {shelter.distance || 'Distance unavailable'} away
          </strong>
          {shelter.location_name ? ` • ${shelter.location_name}` : ''}
        </p>

        <p
          style={{
            margin: '0 0 12px',
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}
        >
          🕒 Posted:{' '}
          <strong style={{ color: '#e2e8f0' }}>
            {formatPostTime(shelter.created_at)}
          </strong>
        </p>

        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '10px 12px',
            borderRadius: '6px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: shelter.is_admin && hasBedData ? '8px' : 0,
              fontSize: '0.85rem',
            }}
          >
            <span style={{ color: '#cbd5e1' }}>Available Beds:</span>

            <strong
              style={{
                color: !hasBedData
                  ? '#94a3b8'
                  : availableBeds > 0
                    ? '#34d399'
                    : '#f87171',
              }}
            >
              {hasBedData
                ? `${availableBeds} / ${totalBeds} beds`
                : 'Not available'}
            </strong>
          </div>

          {shelter.is_admin && hasBedData && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={updatingBeds || availableBeds <= 0}
                onClick={(event) => updateBeds('remove', event)}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: '5px',
                  padding: '7px',
                  cursor: 'pointer',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '600',
                  opacity: updatingBeds || availableBeds <= 0 ? 0.5 : 1,
                }}
              >
                − Remove Bed
              </button>

              <button
                type="button"
                disabled={updatingBeds || availableBeds >= totalBeds}
                onClick={(event) => updateBeds('add', event)}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: '5px',
                  padding: '7px',
                  cursor: 'pointer',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontWeight: '600',
                  opacity: updatingBeds || availableBeds >= totalBeds ? 0.5 : 1,
                }}
              >
                + Add Bed
              </button>
            </div>
          )}
        </div>

        <p
          style={{
            margin: '0 0 4px',
            fontSize: '0.8rem',
            color: '#cbd5e1',
          }}
        >
          <strong style={{ color: '#94a3b8' }}>ML Risk:</strong>{' '}
          {shelter.risk_level || 'Low Risk'}
        </p>

        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}
        >
          <strong style={{ color: '#cbd5e1' }}>Facilities:</strong>{' '}
          {shelter.facilities || 'Water, Emergency Shelter, Power'}
        </p>
      </div>
    </div>
  );
}