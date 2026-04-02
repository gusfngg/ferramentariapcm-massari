import { EmployeeSaveInput, PublicEmployee, ToolSaveInput, Tool } from '@/lib/types';

async function parseError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchTools() {
  const response = await fetch('/api/tools', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Erro ao carregar ferramentas'));
  }
  return (await response.json()) as Tool[];
}

export async function fetchEmployees() {
  const response = await fetch('/api/employees', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Erro ao carregar funcionários'));
  }
  return (await response.json()) as PublicEmployee[];
}

export async function fetchAdminData() {
  const [tools, employees] = await Promise.all([fetchTools(), fetchEmployees()]);
  return { tools, employees };
}

function toFormData(data: ToolSaveInput | EmployeeSaveInput) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(data)) {
    if (
      value === undefined ||
      value === null ||
      key === 'photoFile' ||
      key === 'removePhoto' ||
      key === 'photoUrl'
    ) {
      continue;
    }

    if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
      continue;
    }

    formData.append(key, String(value));
  }

  if (data.photoFile) {
    formData.append('photo', data.photoFile);
  }

  if (data.removePhoto) {
    formData.append('removePhoto', '1');
  }

  return formData;
}

export async function saveTool(data: ToolSaveInput, toolId?: string) {
  const endpoint = toolId ? `/api/tools/${toolId}` : '/api/tools';
  const method = toolId ? 'PUT' : 'POST';

  const response = await fetch(endpoint, {
    method,
    body: toFormData(data),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Erro ao salvar ferramenta'));
  }

  return (await response.json()) as Tool;
}

export async function removeTool(toolId: string) {
  const response = await fetch(`/api/tools/${toolId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Erro ao remover ferramenta'));
  }
}

export async function saveEmployee(data: EmployeeSaveInput, employeeId?: string) {
  const endpoint = employeeId ? `/api/employees/${employeeId}` : '/api/employees';
  const method = employeeId ? 'PUT' : 'POST';

  const response = await fetch(endpoint, {
    method,
    body: toFormData(data),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Erro ao salvar funcionário'));
  }

  return (await response.json()) as PublicEmployee;
}

export async function removeEmployee(employeeId: string) {
  const response = await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Erro ao remover funcionário'));
  }
}
