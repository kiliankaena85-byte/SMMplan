export interface ControlEntry {
  control_id: string;
  module: string;
  category: 'security' | 'financial' | 'race' | 'business_logic';
  status: string;
  evidence_level: string;
  file_path?: string;
  line_range?: string;
  code_snippet?: string;
  test_output?: string;
  reconciliation_output?: string;
}

export function validateEvidence(control: ControlEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (control.status === 'VERIFIED_PASS') {
    if (!control.file_path || !control.line_range || !control.code_snippet) {
      errors.push('VERIFIED_PASS requires exact file_path, line_range, and code_snippet.');
    }

    if (control.category === 'security' && !['L4_NEGATIVE_TEST_PASSED', 'L5_RACE_FUZZ_PASSED', 'L6_RECONCILIATION_PASSED', 'L7_MONITORED', 'L8_PRODUCTION_PROVEN'].includes(control.evidence_level)) {
      errors.push(`Security control requires at least L4_NEGATIVE_TEST_PASSED evidence. Got: ${control.evidence_level}`);
    }

    if (control.category === 'financial' && !['L6_RECONCILIATION_PASSED', 'L7_MONITORED', 'L8_PRODUCTION_PROVEN'].includes(control.evidence_level)) {
      errors.push(`Financial control requires at least L6_RECONCILIATION_PASSED evidence. Got: ${control.evidence_level}`);
    }

    if (control.category === 'race' && !['L5_RACE_FUZZ_PASSED', 'L6_RECONCILIATION_PASSED', 'L7_MONITORED', 'L8_PRODUCTION_PROVEN'].includes(control.evidence_level)) {
      errors.push(`Race control requires at least L5_RACE_FUZZ_PASSED evidence. Got: ${control.evidence_level}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
