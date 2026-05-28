import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Mail, MapPin, Pencil, Phone, Plus, Users } from 'lucide-react';
import api from '../../api/axios';
import { getStoredServerUrl } from '../../api/serverConfig';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';

interface Employee {
  id: number;
  fullName: string;
  position: string;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate?: string | null;
  rate?: number | null;
  notes?: string | null;
  userId?: number | null;
  userFullName?: string | null;
  userRole?: string | null;
}

interface UserOption {
  id: number;
  fullName: string;
  role: string;
}

interface GroupOption {
  id: number;
  name: string;
}

interface InventoryItem {
  id: number;
  inventoryNumber: string;
  name: string;
  category: string;
  location?: string | null;
  assignmentType?: 'employee' | 'group' | 'outdoor' | 'storage';
  responsibleName?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  outdoorArea?: string | null;
  initialValue?: number | null;
  status?: string | null;
  arrivalDate?: string | null;
  responsibleId?: number | null;
  notes?: string | null;
  assignmentLabel?: string;
}

interface EmployeeDocument {
  id: number;
  title: string;
  documentType: string;
  documentNumber?: string | null;
  fileName?: string | null;
  originalFileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  issueDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

interface EmployeeHistoryItem {
  id: number;
  eventType: string;
  title: string;
  description?: string | null;
  createdAt?: string | null;
  userId?: number | null;
  userFullName?: string | null;
}

interface InventoryTransferHistoryItem {
  id: number;
  inventoryId: number;
  inventoryNumber?: string | null;
  inventoryName?: string | null;
  fromEmployeeId?: number | null;
  toEmployeeId?: number | null;
  fromEmployeeName?: string | null;
  note?: string | null;
  transferredAt?: string | null;
}

const emptyForm = {
  fullName: '',
  position: '',
  department: '',
  phone: '',
  email: '',
  address: '',
  hireDate: '',
  rate: '',
  notes: '',
  userId: '',
};

const emptyInventoryForm = {
  inventoryNumber: '',
  name: '',
  category: '',
  location: '',
  assignmentType: 'storage',
  groupId: '',
  outdoorArea: '',
  initialValue: '',
  status: 'good',
  arrivalDate: '',
  notes: '',
};

const emptyDocumentForm = {
  title: '',
  documentType: '',
  documentNumber: '',
  issueDate: '',
  notes: '',
  file: null as File | null,
};

const emptyTransferForm = {
  inventoryId: '',
  toEmployeeId: '',
  note: '',
};

const emptyPlacementForm = {
  inventoryId: '',
  assignmentType: 'storage',
  employeeId: '',
  groupId: '',
  outdoorArea: '',
  note: '',
};

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<{
    employee: Employee;
    assignedInventory: InventoryItem[];
    availableInventory: InventoryItem[];
    documents: EmployeeDocument[];
    history: EmployeeHistoryItem[];
    transferHistory: InventoryTransferHistoryItem[];
    inventoryRegistry?: InventoryItem[];
  } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);
  const [transferForm, setTransferForm] = useState(emptyTransferForm);
  const [placementForm, setPlacementForm] = useState(emptyPlacementForm);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, usersRes, groupsRes] = await Promise.all([
        api.get('/employees'),
        api.get('/auth/users'),
        api.get('/children/groups'),
      ]);
      setEmployees(employeesRes.data);
      setUsers(usersRes.data);
      setGroups(groupsRes.data);
    } catch (requestError) {
      console.error('Не вдалося завантажити співробітників:', requestError);
      setError('Не вдалося завантажити список співробітників.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingEmployeeId(null);
    setForm(emptyForm);
  };

  const resetInventoryForm = () => {
    setInventoryForm(emptyInventoryForm);
    setSelectedInventoryId('');
  };

  const resetDocumentForm = () => {
    setDocumentForm(emptyDocumentForm);
  };

  const resetTransferForm = () => {
    setTransferForm(emptyTransferForm);
  };

  const resetPlacementForm = () => {
    setPlacementForm(emptyPlacementForm);
  };

  const openCreateModal = () => {
    setError(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setError(null);
    setEditingEmployeeId(employee.id);
    setForm({
      fullName: employee.fullName,
      position: employee.position,
      department: employee.department || '',
      phone: employee.phone || '',
      email: employee.email || '',
      address: employee.address || '',
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().slice(0, 10) : '',
      rate: employee.rate !== null && employee.rate !== undefined ? String(employee.rate) : '',
      notes: employee.notes || '',
      userId: employee.userId ? String(employee.userId) : '',
    });
    setIsModalOpen(true);
  };

  const loadEmployeeDetails = async (employeeId: number) => {
    try {
      const response = await api.get(`/employees/${employeeId}`);
      setEmployeeDetails(response.data);
      setSelectedEmployeeId(employeeId);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося завантажити картку співробітника.');
    }
  };

  const linkedUserOptions = useMemo(
    () => [{ id: '', name: 'Без прив’язки до облікового запису' }, ...users.map((user) => ({
      id: user.id,
      name: `${user.fullName} (${user.role})`,
    }))],
    [users]
  );

  const availableUnassignedInventory = useMemo(() => {
    return (employeeDetails?.availableInventory ?? []).filter(
      (item) =>
        item.assignmentType === 'storage' ||
        item.responsibleId === selectedEmployeeId
    );
  }, [employeeDetails, selectedEmployeeId]);

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.id !== selectedEmployeeId)
        .map((employee) => ({
          id: employee.id,
          name: `${employee.fullName} (${employee.position})`,
        })),
    [employees, selectedEmployeeId]
  );

  const groupOptions = useMemo(
    () => groups.map((group) => ({ id: group.id, name: group.name })),
    [groups]
  );

  const openInventoryCreateModal = (assignmentType: 'employee' | 'storage' = 'storage') => {
    resetInventoryForm();
    setInventoryForm((current) => ({
      ...current,
      assignmentType,
    }));
    setIsInventoryModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      fullName: form.fullName,
      position: form.position,
      department: form.department,
      phone: form.phone,
      email: form.email,
      address: form.address,
      hireDate: form.hireDate || undefined,
      rate: form.rate ? Number(form.rate) : null,
      notes: form.notes,
      userId: form.userId ? Number(form.userId) : null,
    };

    try {
      if (editingEmployeeId) {
        await api.put(`/employees/${editingEmployeeId}`, payload);
      } else {
        await api.post('/employees', payload);
      }

      setIsModalOpen(false);
      resetForm();
      await loadData();
      if (selectedEmployeeId) {
        await loadEmployeeDetails(selectedEmployeeId);
      }
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося зберегти співробітника.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignInventory = async () => {
    if (!selectedEmployeeId || !selectedInventoryId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post(`/employees/${selectedEmployeeId}/inventory/assign`, {
        inventoryId: Number(selectedInventoryId),
      });
      setEmployeeDetails(response.data);
      await loadData();
      setSelectedInventoryId('');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося закріпити ТМЦ.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInventory = async (event: React.FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      await api.post('/employees/inventory', {
        inventoryNumber: inventoryForm.inventoryNumber,
        name: inventoryForm.name,
        category: inventoryForm.category,
        location: inventoryForm.location,
        assignmentType: inventoryForm.assignmentType,
        employeeId: inventoryForm.assignmentType === 'employee'
          ? Number(selectedEmployeeId || 0)
          : undefined,
        groupId: inventoryForm.assignmentType === 'group' && inventoryForm.groupId
          ? Number(inventoryForm.groupId)
          : undefined,
        outdoorArea: inventoryForm.assignmentType === 'outdoor'
          ? inventoryForm.outdoorArea
          : undefined,
        initialValue: inventoryForm.initialValue ? Number(inventoryForm.initialValue) : null,
        status: inventoryForm.status,
        arrivalDate: inventoryForm.arrivalDate || undefined,
        notes: inventoryForm.notes,
      });

      resetInventoryForm();
      setIsInventoryModalOpen(false);
      await loadData();
      if (selectedEmployeeId) {
        await loadEmployeeDetails(selectedEmployeeId);
      }
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося створити ТМЦ.');
    } finally {
      setSaving(false);
    }
  };

  const handleReassignPlacement = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post('/employees/inventory/reassign', {
        inventoryId: Number(placementForm.inventoryId),
        assignmentType: placementForm.assignmentType,
        employeeId: placementForm.assignmentType === 'employee' && placementForm.employeeId
          ? Number(placementForm.employeeId)
          : undefined,
        groupId: placementForm.assignmentType === 'group' && placementForm.groupId
          ? Number(placementForm.groupId)
          : undefined,
        outdoorArea: placementForm.assignmentType === 'outdoor'
          ? placementForm.outdoorArea
          : undefined,
        note: placementForm.note,
      });

      setIsPlacementModalOpen(false);
      resetPlacementForm();
      if (selectedEmployeeId) {
        await loadEmployeeDetails(selectedEmployeeId);
      }
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося змінити прив’язку ТМЦ.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDocument = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedEmployeeId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let filePayload: {
        fileName?: string;
        originalFileName?: string;
        mimeType?: string;
        fileContentBase64?: string;
      } = {};

      if (documentForm.file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            const payload = result.includes(',') ? result.split(',')[1] : result;
            resolve(payload);
          };
          reader.onerror = () => reject(new Error('Не вдалося прочитати файл документа'));
          reader.readAsDataURL(documentForm.file as File);
        });

        filePayload = {
          fileName: documentForm.file.name,
          originalFileName: documentForm.file.name,
          mimeType: documentForm.file.type,
          fileContentBase64: base64,
        };
      }

      const response = await api.post(`/employees/${selectedEmployeeId}/documents`, {
        title: documentForm.title,
        documentType: documentForm.documentType,
        documentNumber: documentForm.documentNumber,
        issueDate: documentForm.issueDate || undefined,
        notes: documentForm.notes,
        ...filePayload,
      });

      setEmployeeDetails(response.data);
      resetDocumentForm();
      setIsDocumentModalOpen(false);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося додати документ.');
    } finally {
      setSaving(false);
    }
  };

  const handleTransferInventory = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedEmployeeId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.post(`/employees/${selectedEmployeeId}/inventory/transfer`, {
        inventoryId: Number(transferForm.inventoryId),
        toEmployeeId: Number(transferForm.toEmployeeId),
        note: transferForm.note,
      });

      setIsTransferModalOpen(false);
      resetTransferForm();
      await loadEmployeeDetails(selectedEmployeeId);
      await loadData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося передати ТМЦ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-widest text-warm-500 font-bold">Кадровий модуль</p>
          <h2 className="text-3xl font-bold text-gray-800">Співробітники</h2>
          <p className="text-gray-500 mt-2">Облік працівників, посад, контактів та прив’язки до облікових записів.</p>
        </div>
        <button onClick={openCreateModal} className="ui-button-primary">
          <Plus size={18} /> Додати співробітника
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white p-6 rounded-3xl border border-warm-100 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <Users size={18} className="text-warm-500" />
            Всього співробітників
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">{employees.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-warm-100 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <Briefcase size={18} className="text-warm-500" />
            Посад у базі
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">
            {new Set(employees.map((employee) => employee.position)).size}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-warm-100 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <Users size={18} className="text-warm-500" />
            Прив’язані акаунти
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">
            {employees.filter((employee) => employee.userId).length}
          </div>
        </div>
      </div>


      <div className="bg-white rounded-3xl border border-warm-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-warm-100 bg-warm-50/20">
          <h4 className="font-bold text-gray-800">Список співробітників</h4>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400">Завантаження співробітників...</div>
        ) : employees.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">Співробітників ще не додано.</div>
        ) : (
          <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4 md:grid-cols-2">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`rounded-3xl border p-5 shadow-sm hover:shadow-md transition bg-white cursor-pointer ${
                  selectedEmployeeId === employee.id ? 'border-warm-500 bg-warm-50/40' : 'border-warm-100'
                }`}
                onClick={() => void loadEmployeeDetails(employee.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{employee.fullName}</h3>
                    <p className="text-sm text-warm-600 font-medium mt-1">{employee.position}</p>
                    <p className="text-xs text-gray-500 mt-1">{employee.department || 'Без підрозділу'}</p>
                  </div>
                  <button
                    onClick={() => openEditModal(employee)}
                    className="rounded-xl p-2 text-gray-400 hover:bg-warm-50 hover:text-warm-600 transition"
                  >
                    <Pencil size={16} />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span>{employee.phone || 'Телефон не вказано'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <span>{employee.email || 'Email не вказано'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-0.5" />
                    <span>{employee.address || 'Адресу не вказано'}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {employee.userFullName ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Акаунт: {employee.userFullName}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                      Без акаунта
                    </span>
                  )}
                  {employee.rate !== null && employee.rate !== undefined && (
                    <span className="rounded-full bg-warm-50 px-3 py-1 text-xs font-bold text-warm-700">
                      Ставка: {employee.rate}
                    </span>
                  )}
                </div>
              </div>
            ))}
            </div>

            <div className="rounded-3xl border border-warm-100 p-5 shadow-sm bg-white h-fit">
              {employeeDetails ? (
                <div className="space-y-6">
                  <div className="border-b border-warm-100 pb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-warm-500">Картка співробітника</p>
                    <h3 className="mt-2 text-2xl font-bold text-gray-800">{employeeDetails.employee.fullName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{employeeDetails.employee.position}</p>
                    <p className="text-sm text-gray-500">{employeeDetails.employee.department || 'Без підрозділу'}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-warm-50 p-4 border border-warm-100">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Телефон</div>
                      <div className="mt-1 font-bold text-gray-800">{employeeDetails.employee.phone || 'Не вказано'}</div>
                    </div>
                    <div className="rounded-2xl bg-warm-50 p-4 border border-warm-100">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Email</div>
                      <div className="mt-1 font-bold text-gray-800">{employeeDetails.employee.email || 'Не вказано'}</div>
                    </div>
                    <div className="rounded-2xl bg-warm-50 p-4 border border-warm-100 sm:col-span-2">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Адреса</div>
                      <div className="mt-1 font-bold text-gray-800">{employeeDetails.employee.address || 'Не вказано'}</div>
                    </div>
                    <div className="rounded-2xl bg-warm-50 p-4 border border-warm-100">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Дата прийому</div>
                      <div className="mt-1 font-bold text-gray-800">
                        {employeeDetails.employee.hireDate
                          ? new Date(employeeDetails.employee.hireDate).toLocaleDateString('uk-UA')
                          : 'Не вказано'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-warm-50 p-4 border border-warm-100">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Прив’язаний акаунт</div>
                      <div className="mt-1 font-bold text-gray-800">
                        {employeeDetails.employee.userFullName || 'Без акаунта'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">Закріплені ТМЦ</h4>
                        <p className="text-sm text-gray-500">Майно, за яке відповідає співробітник.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            resetTransferForm();
                            setIsTransferModalOpen(true);
                          }}
                          className="ui-button-secondary"
                        >
                          Передати ТМЦ
                        </button>
                        <button
                          onClick={() => {
                            openInventoryCreateModal('employee');
                          }}
                          className="ui-button-secondary"
                        >
                          <Plus size={16} /> Нова ТМЦ
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-warm-100 p-4 bg-warm-50/40 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Прив’язати існуючу ТМЦ</div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <CustomSelect
                            options={availableUnassignedInventory.map((item) => ({
                              id: item.id,
                              name: `${item.inventoryNumber} • ${item.name}`,
                            }))}
                            value={selectedInventoryId}
                            onChange={(value) => setSelectedInventoryId(String(value))}
                            placeholder="Оберіть ТМЦ"
                          />
                        </div>
                        <button
                          onClick={() => void handleAssignInventory()}
                          disabled={!selectedInventoryId || saving}
                          className="ui-button-primary"
                        >
                          Закріпити
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {employeeDetails.assignedInventory.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-warm-200 p-6 text-center text-gray-400">
                          За співробітником ще не закріплено жодної ТМЦ.
                        </div>
                      ) : (
                        employeeDetails.assignedInventory.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-warm-100 p-4 bg-white">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-gray-800">{item.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.inventoryNumber} • {item.category}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.location || 'Локацію не вказано'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold uppercase text-gray-400">{item.status || 'good'}</div>
                                <div className="text-sm font-bold text-warm-600 mt-1">
                                  {item.initialValue !== null && item.initialValue !== undefined ? item.initialValue : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">Документи</h4>
                        <p className="text-sm text-gray-500">Кадрові та службові документи співробітника.</p>
                      </div>
                      <button
                        onClick={() => {
                          resetDocumentForm();
                          setIsDocumentModalOpen(true);
                        }}
                        className="ui-button-secondary"
                      >
                        <Plus size={16} /> Додати документ
                      </button>
                    </div>

                    <div className="space-y-3">
                      {employeeDetails.documents.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-warm-200 p-6 text-center text-gray-400">
                          Документи ще не додані.
                        </div>
                      ) : (
                        employeeDetails.documents.map((document) => (
                          <div key={document.id} className="rounded-2xl border border-warm-100 p-4 bg-white">
                            <div className="font-bold text-gray-800">{document.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {document.documentType}
                              {document.documentNumber ? ` • № ${document.documentNumber}` : ''}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {document.issueDate
                                ? new Date(document.issueDate).toLocaleDateString('uk-UA')
                                : 'Дата не вказана'}
                            </div>
                            {document.filePath && (
                              <a
                                href={`${getStoredServerUrl()}${document.filePath}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex mt-2 text-sm font-medium text-warm-600 hover:underline"
                              >
                                {document.originalFileName || 'Відкрити вкладений файл'}
                              </a>
                            )}
                            {document.notes && (
                              <div className="text-sm text-gray-600 mt-2">{document.notes}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Кадрова історія</h4>
                      <p className="text-sm text-gray-500">Ключові події та зміни по співробітнику.</p>
                    </div>

                    <div className="space-y-3">
                      {employeeDetails.history.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-warm-200 p-6 text-center text-gray-400">
                          Історія змін поки порожня.
                        </div>
                      ) : (
                        employeeDetails.history.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-warm-100 p-4 bg-white">
                            <div className="font-bold text-gray-800">{item.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString('uk-UA')
                                : 'Дата не вказана'}
                            </div>
                            {item.description && (
                              <div className="text-sm text-gray-600 mt-2">{item.description}</div>
                            )}
                            {item.userFullName && (
                              <div className="text-xs text-gray-500 mt-2">
                                Виконавець: {item.userFullName}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Історія передач ТМЦ</h4>
                      <p className="text-sm text-gray-500">Останні зміни матеріальної відповідальності.</p>
                    </div>

                    <div className="space-y-3">
                      {employeeDetails.transferHistory.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-warm-200 p-6 text-center text-gray-400">
                          Історія передач поки порожня.
                        </div>
                      ) : (
                        employeeDetails.transferHistory.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-warm-100 p-4 bg-white">
                            <div className="font-bold text-gray-800">
                              {item.inventoryName || 'ТМЦ'} {item.inventoryNumber ? `• ${item.inventoryNumber}` : ''}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.transferredAt
                                ? new Date(item.transferredAt).toLocaleString('uk-UA')
                                : 'Дата не вказана'}
                            </div>
                            <div className="text-sm text-gray-600 mt-2">
                              {item.note || 'Передача без пояснення'}
                            </div>
                            {item.fromEmployeeName && (
                              <div className="text-xs text-gray-500 mt-1">
                                Оформлено користувачем: {item.fromEmployeeName}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400">
                  Оберіть співробітника, щоб відкрити повну картку та список закріплених ТМЦ.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployeeId ? 'Редагування співробітника' : 'Новий співробітник'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder="ПІБ співробітника"
              className="ui-input"
              required
            />
            <input
              value={form.position}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
              placeholder="Посада"
              className="ui-input"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.department}
              onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              placeholder="Підрозділ / група"
              className="ui-input"
            />
            <CustomSelect
              options={linkedUserOptions}
              value={form.userId}
              onChange={(value) => setForm((current) => ({ ...current, userId: String(value) }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Телефон"
              className="ui-input"
            />
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              className="ui-input"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="date"
              value={form.hireDate}
              onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))}
              className="ui-input"
            />
            <input
              type="number"
              step="0.01"
              value={form.rate}
              onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))}
              placeholder="Ставка"
              className="ui-input"
            />
          </div>

          <input
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            placeholder="Адреса"
            className="ui-input"
          />

          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Примітки"
            rows={4}
            className="ui-textarea"
          />

          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3">
            {saving ? 'Збереження...' : editingEmployeeId ? 'Оновити співробітника' : 'Зберегти співробітника'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        title="Новий документ співробітника"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={documentForm.title}
              onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Назва документа"
              className="ui-input"
              required
            />
            <input
              value={documentForm.documentType}
              onChange={(event) => setDocumentForm((current) => ({ ...current, documentType: event.target.value }))}
              placeholder="Тип документа"
              className="ui-input"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={documentForm.documentNumber}
              onChange={(event) => setDocumentForm((current) => ({ ...current, documentNumber: event.target.value }))}
              placeholder="Номер документа"
              className="ui-input"
            />
            <input
              type="date"
              value={documentForm.issueDate}
              onChange={(event) => setDocumentForm((current) => ({ ...current, issueDate: event.target.value }))}
              className="ui-input"
            />
          </div>

          <textarea
            value={documentForm.notes}
            onChange={(event) => setDocumentForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Примітки"
            rows={4}
            className="ui-textarea"
          />

          <input
            type="file"
            onChange={(event) =>
              setDocumentForm((current) => ({
                ...current,
                file: event.target.files?.[0] || null,
              }))
            }
            className="ui-input"
          />

          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3">
            {saving ? 'Збереження...' : 'Додати документ'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title="Нова одиниця ТМЦ"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateInventory} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={inventoryForm.inventoryNumber}
              onChange={(event) => setInventoryForm((current) => ({ ...current, inventoryNumber: event.target.value }))}
              placeholder="Інвентарний номер"
              className="ui-input"
              required
            />
            <input
              value={inventoryForm.name}
              onChange={(event) => setInventoryForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Назва ТМЦ"
              className="ui-input"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={inventoryForm.category}
              onChange={(event) => setInventoryForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Категорія"
              className="ui-input"
              required
            />
            <input
              value={inventoryForm.location}
              onChange={(event) => setInventoryForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Локація"
              className="ui-input"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              step="0.01"
              value={inventoryForm.initialValue}
              onChange={(event) => setInventoryForm((current) => ({ ...current, initialValue: event.target.value }))}
              placeholder="Первісна вартість"
              className="ui-input"
            />
            <input
              value={inventoryForm.status}
              onChange={(event) => setInventoryForm((current) => ({ ...current, status: event.target.value }))}
              placeholder="Стан"
              className="ui-input"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CustomSelect
              options={[
                { id: 'storage', name: 'Склад без прив’язки' },
                { id: 'employee', name: 'За співробітником' },
                { id: 'group', name: 'За групою' },
                { id: 'outdoor', name: 'Територія садка' },
              ]}
              value={inventoryForm.assignmentType}
              onChange={(value) => setInventoryForm((current) => ({ ...current, assignmentType: String(value) }))}
            />

            {inventoryForm.assignmentType === 'group' ? (
              <CustomSelect
                options={groupOptions}
                value={inventoryForm.groupId}
                onChange={(value) => setInventoryForm((current) => ({ ...current, groupId: String(value) }))}
                placeholder="Оберіть групу"
              />
            ) : inventoryForm.assignmentType === 'outdoor' ? (
              <input
                value={inventoryForm.outdoorArea}
                onChange={(event) => setInventoryForm((current) => ({ ...current, outdoorArea: event.target.value }))}
                placeholder="Ділянка / зона на території"
                className="ui-input"
              />
            ) : (
              <div className="rounded-2xl border border-warm-100 bg-warm-50 px-4 py-3 text-sm text-gray-500">
                {inventoryForm.assignmentType === 'employee'
                  ? 'ТМЦ буде закріплено за обраним співробітником.'
                  : 'Об’єкт залишиться на складі без прив’язки.'}
              </div>
            )}
          </div>

          <input
            type="date"
            value={inventoryForm.arrivalDate}
            onChange={(event) => setInventoryForm((current) => ({ ...current, arrivalDate: event.target.value }))}
            className="ui-input"
          />

          <textarea
            value={inventoryForm.notes}
            onChange={(event) => setInventoryForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Примітки: модель, сорт дерева, серійний номер, опис стану"
            rows={3}
            className="ui-textarea"
          />

          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3">
            {saving ? 'Збереження...' : 'Створити та закріпити ТМЦ'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Передача ТМЦ іншому співробітнику"
        maxWidth="2xl"
      >
        <form onSubmit={handleTransferInventory} className="space-y-4">
          <CustomSelect
            options={(employeeDetails?.assignedInventory ?? []).map((item) => ({
              id: item.id,
              name: `${item.inventoryNumber} • ${item.name}`,
            }))}
            value={transferForm.inventoryId}
            onChange={(value) => setTransferForm((current) => ({ ...current, inventoryId: String(value) }))}
            placeholder="Оберіть ТМЦ для передачі"
          />

          <CustomSelect
            options={employeeOptions}
            value={transferForm.toEmployeeId}
            onChange={(value) => setTransferForm((current) => ({ ...current, toEmployeeId: String(value) }))}
            placeholder="Оберіть нового відповідального"
          />

          <textarea
            value={transferForm.note}
            onChange={(event) => setTransferForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Причина або примітка до передачі"
            rows={4}
            className="ui-textarea"
          />

          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3">
            {saving ? 'Передача...' : 'Передати ТМЦ'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isPlacementModalOpen}
        onClose={() => setIsPlacementModalOpen(false)}
        title="Змінити прив’язку ТМЦ / майна"
        maxWidth="2xl"
      >
        <form onSubmit={handleReassignPlacement} className="space-y-4">
          <CustomSelect
            options={[
              { id: 'storage', name: 'Склад без прив’язки' },
              { id: 'employee', name: 'За співробітником' },
              { id: 'group', name: 'За групою' },
              { id: 'outdoor', name: 'Територія садка' },
            ]}
            value={placementForm.assignmentType}
            onChange={(value) => setPlacementForm((current) => ({ ...current, assignmentType: String(value) }))}
          />

          {placementForm.assignmentType === 'employee' && (
            <CustomSelect
              options={employees.map((employee) => ({
                id: employee.id,
                name: `${employee.fullName} (${employee.position})`,
              }))}
              value={placementForm.employeeId}
              onChange={(value) => setPlacementForm((current) => ({ ...current, employeeId: String(value) }))}
              placeholder="Оберіть співробітника"
            />
          )}

          {placementForm.assignmentType === 'group' && (
            <CustomSelect
              options={groupOptions}
              value={placementForm.groupId}
              onChange={(value) => setPlacementForm((current) => ({ ...current, groupId: String(value) }))}
              placeholder="Оберіть групу"
            />
          )}

          {placementForm.assignmentType === 'outdoor' && (
            <input
              value={placementForm.outdoorArea}
              onChange={(event) => setPlacementForm((current) => ({ ...current, outdoorArea: event.target.value }))}
              placeholder="Ділянка / зона / дерево / майданчик"
              className="ui-input"
            />
          )}

          <textarea
            value={placementForm.note}
            onChange={(event) => setPlacementForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Причина зміни прив’язки або примітка"
            rows={4}
            className="ui-textarea"
          />

          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3">
            {saving ? 'Збереження...' : 'Змінити прив’язку'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
