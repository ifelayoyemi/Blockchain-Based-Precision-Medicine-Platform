import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts
// Note: This is a simplified mock for testing purposes
// In a real implementation, you would use a proper testing framework for Clarity

// Mock contract state
const mockPatients = new Map();
const mockPatientAuth = new Map();

// Mock contract functions
const patientIdentityContract = {
  registerPatient: (patientId, name, dateOfBirth, contactInfo) => {
    const patientKey = JSON.stringify({ patient_id: patientId });
    
    if (mockPatients.has(patientKey)) {
      return { error: 'ERR_ALREADY_EXISTS' };
    }
    
    mockPatients.set(patientKey, {
      name,
      date_of_birth: dateOfBirth,
      contact_info: contactInfo,
      active: true,
      created_at: 123 // Mock block height
    });
    
    mockPatientAuth.set(patientKey, {
      owner: 'tx-sender',
      authorized_providers: []
    });
    
    return { success: true };
  },
  
  updatePatientInfo: (patientId, name, contactInfo) => {
    const patientKey = JSON.stringify({ patient_id: patientId });
    
    if (!mockPatients.has(patientKey)) {
      return { error: 'ERR_NOT_FOUND' };
    }
    
    const currentData = mockPatients.get(patientKey);
    mockPatients.set(patientKey, {
      ...currentData,
      name,
      contact_info: contactInfo
    });
    
    return { success: true };
  },
  
  addAuthorizedProvider: (patientId, provider) => {
    const patientKey = JSON.stringify({ patient_id: patientId });
    
    if (!mockPatientAuth.has(patientKey)) {
      return { error: 'ERR_NOT_FOUND' };
    }
    
    const authData = mockPatientAuth.get(patientKey);
    if (authData.owner !== 'tx-sender') {
      return { error: 'ERR_UNAUTHORIZED' };
    }
    
    authData.authorized_providers.push(provider);
    mockPatientAuth.set(patientKey, authData);
    
    return { success: true };
  },
  
  getPatientInfo: (patientId) => {
    const patientKey = JSON.stringify({ patient_id: patientId });
    
    if (!mockPatients.has(patientKey)) {
      return { error: 'ERR_NOT_FOUND' };
    }
    
    return { success: mockPatients.get(patientKey) };
  }
};

describe('Patient Identity Contract', () => {
  beforeEach(() => {
    // Clear mock state before each test
    mockPatients.clear();
    mockPatientAuth.clear();
  });
  
  it('should register a new patient', () => {
    const patientId = 'patient123';
    const result = patientIdentityContract.registerPatient(
        patientId,
        'John Doe',
        19900101,
        'john@example.com'
    );
    
    expect(result.success).toBe(true);
    
    const patientKey = JSON.stringify({ patient_id: patientId });
    expect(mockPatients.has(patientKey)).toBe(true);
    
    const patientData = mockPatients.get(patientKey);
    expect(patientData.name).toBe('John Doe');
    expect(patientData.active).toBe(true);
  });
  
  it('should not register a patient that already exists', () => {
    const patientId = 'patient123';
    
    // Register patient first time
    patientIdentityContract.registerPatient(
        patientId,
        'John Doe',
        19900101,
        'john@example.com'
    );
    
    // Try to register again
    const result = patientIdentityContract.registerPatient(
        patientId,
        'John Doe',
        19900101,
        'john@example.com'
    );
    
    expect(result.error).toBe('ERR_ALREADY_EXISTS');
  });
  
  it('should update patient information', () => {
    const patientId = 'patient123';
    
    // Register patient
    patientIdentityContract.registerPatient(
        patientId,
        'John Doe',
        19900101,
        'john@example.com'
    );
    
    // Update patient info
    const result = patientIdentityContract.updatePatientInfo(
        patientId,
        'John Smith',
        'john.smith@example.com'
    );
    
    expect(result.success).toBe(true);
    
    const patientKey = JSON.stringify({ patient_id: patientId });
    const patientData = mockPatients.get(patientKey);
    expect(patientData.name).toBe('John Smith');
    expect(patientData.contact_info).toBe('john.smith@example.com');
    // Date of birth should remain unchanged
    expect(patientData.date_of_birth).toBe(19900101);
  });
  
  it('should add an authorized provider', () => {
    const patientId = 'patient123';
    const provider = 'provider456';
    
    // Register patient
    patientIdentityContract.registerPatient(
        patientId,
        'John Doe',
        19900101,
        'john@example.com'
    );
    
    // Add authorized provider
    const result = patientIdentityContract.addAuthorizedProvider(
        patientId,
        provider
    );
    
    expect(result.success).toBe(true);
    
    const patientKey = JSON.stringify({ patient_id: patientId });
    const authData = mockPatientAuth.get(patientKey);
    expect(authData.authorized_providers).toContain(provider);
  });
  
  it('should retrieve patient information', () => {
    const patientId = 'patient123';
    
    // Register patient
    patientIdentityContract.registerPatient(
        patientId,
        'John Doe',
        19900101,
        'john@example.com'
    );
    
    // Get patient info
    const result = patientIdentityContract.getPatientInfo(patientId);
    
    expect(result.success).toBeDefined();
    expect(result.success.name).toBe('John Doe');
    expect(result.success.date_of_birth).toBe(19900101);
    expect(result.success.contact_info).toBe('john@example.com');
    expect(result.success.active).toBe(true);
  });
});
