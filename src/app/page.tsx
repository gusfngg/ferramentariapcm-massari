'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import ToolIcon from '@/components/ToolIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SUPREME_ADMIN_BADGE } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { PublicEmployee, Tool } from '@/lib/types';

const ROLE_LABEL: Record<string, string> = {
  mechanic: 'Mecânico',
  admin: 'Admin',
};

const SHIFT_LABEL: Record<string, string> = {
  A: 'Turno A',
  B: 'Turno B',
  C: 'Turno C',
};

const CATEGORY_LABEL: Record<string, string> = {
  hand: 'Manual',
  power: 'Elétrica',
  measuring: 'Medição',
  electrical: 'Elétrica',
  cutting: 'Corte',
};

const TOOL_STATUS_LABEL = {
  available: { label: 'Disponível', className: 'bg-emerald-50 text-emerald-700' },
  unavailable: { label: 'Indisponível no momento', className: 'bg-red-50 text-brand-red' },
  maintenance: { label: 'Em manutenção', className: 'bg-amber-50 text-amber-700' },
} as const;

type Step = 'tool' | 'confirm' | 'success';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function HomePage() {
  const router = useRouter();
  const { employee, login, isReady, wasTimedOut } = useAuth();
  const [profiles, setProfiles] = useState<PublicEmployee[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [step, setStep] = useState<Step>('tool');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expectedReturnTime, setExpectedReturnTime] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [serviceOrder, setServiceOrder] = useState('');
  const [searchTool, setSearchTool] = useState('');
  const [badge, setBadge] = useState('');
  const [password, setPassword] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileSearch, setProfileSearch] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [toolsResponse, employeesResponse] = await Promise.all([
          fetch(`/api/tools?t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/employees?t=${Date.now()}`, { cache: 'no-store' }),
        ]);

        const [toolsPayload, employeesPayload] = await Promise.all([
          toolsResponse.json(),
          employeesResponse.json(),
        ]);

        const nextTools = Array.isArray(toolsPayload) ? toolsPayload : [];
        const nextEmployees = Array.isArray(employeesPayload) ? employeesPayload : [];

        setTools(nextTools);
        setProfiles(
          [...nextEmployees].sort((a: PublicEmployee, b: PublicEmployee) => a.name.localeCompare(b.name))
        );

        if (!toolsResponse.ok || !employeesResponse.ok) {
          setLoginError('Sistema em manutenção. Atualize a página em instantes.');
        }
      } catch {
        setTools([]);
        setProfiles([]);
        setLoginError('Falha ao carregar dados da tela de login.');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!employee) {
      setStep('tool');
      setSelectedTool(null);
      setExpectedReturnTime('');
      setCostCenter('');
      setServiceOrder('');
      setSearchTool('');
      setError('');
      setPassword('');
    }
  }, [employee]);

  useEffect(() => {
    if (step !== 'success') {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.push('/devolucao');
    }, 5000);

    return () => window.clearTimeout(redirectTimer);
  }, [router, step]);

  const visibleTools = useMemo(
    () =>
      tools.filter(
        (tool) =>
          (searchTool === '' ||
            tool.name.toLowerCase().includes(searchTool.toLowerCase()) ||
            tool.code.toLowerCase().includes(searchTool.toLowerCase()))
      ).sort((a, b) => {
        const aDisabled = !a.available || a.condition === 'maintenance';
        const bDisabled = !b.available || b.condition === 'maintenance';
        if (aDisabled === bDisabled) return a.name.localeCompare(b.name);
        return aDisabled ? 1 : -1;
      }),
    [searchTool, tools]
  );

  const getToolStatus = (tool: Tool) => {
    if (tool.condition === 'maintenance') return TOOL_STATUS_LABEL.maintenance;
    if (!tool.available) return TOOL_STATUS_LABEL.unavailable;
    return TOOL_STATUS_LABEL.available;
  };

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.badge === badge) ?? null,
    [badge, profiles]
  );

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        const query = profileSearch.trim().toLowerCase();
        if (!query) return true;

        return (
          profile.name.toLowerCase().includes(query) ||
          profile.badge.toLowerCase().includes(query)
        );
      }),
    [profileSearch, profiles]
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badge: badge.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setLoginError(result.error || 'Não foi possível entrar.');
        return;
      }

      login(result);
      setBadge('');
      setPassword('');
      setProfileSearch('');
      setProfileMenuOpen(false);
      setStep('tool');
    } catch {
      setLoginError('Erro de conexão. Tente novamente.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSelectTool = (tool: Tool) => {
    if (!tool.available || tool.condition === 'maintenance') return;
    setSelectedTool(tool);
    setExpectedReturnTime(getDefaultExpectedReturnTime());
    setCostCenter('');
    setServiceOrder('');
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!employee || !selectedTool) return;
    if (!expectedReturnTime) {
      setError('Selecione a hora prevista de devolução.');
      return;
    }
    if (!costCenter.trim()) {
      setError('Informe o centro de custo onde a ferramenta será usada.');
      return;
    }
    if (!serviceOrder.trim()) {
      setError('Informe a ordem de serviço.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: selectedTool.id,
          employeeId: employee.id,
          expectedReturnTime,
          costCenter: costCenter.trim(),
          serviceOrder: serviceOrder.trim(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Erro ao registrar retirada.');
        return;
      }

      const toolsResponse = await fetch(`/api/tools?t=${Date.now()}`, { cache: 'no-store' });
      const toolsPayload = await toolsResponse.json();
      setTools(Array.isArray(toolsPayload) ? toolsPayload : []);
      setStep('success');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewWithdrawal = () => {
    setSelectedTool(null);
    setExpectedReturnTime('');
    setCostCenter('');
    setServiceOrder('');
    setSearchTool('');
    setError('');
    setStep('tool');
  };

  if (!isReady) return null;

  if (!employee) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#faf9f7]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.10),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(10,10,10,0.06),_transparent_28%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10">
          <div className="grid w-full overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_35px_90px_-45px_rgba(10,10,10,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex items-center justify-center border-b border-brand-gray-border bg-white px-7 py-8 text-brand-black sm:px-10 sm:py-10 lg:border-b-0 lg:border-r">
              <div className="space-y-6 text-center">
                <div className="mx-auto w-fit rounded-2xl border border-brand-gray-border px-5 py-4">
                  <Image src="/massari-logo.svg" alt="Logo Massari" width={220} height={96} className="h-20 w-auto sm:h-24" priority />
                </div>
                <h1 className="text-3xl font-semibold leading-tight text-brand-black sm:text-4xl">
                  Controle da Ferramentaria
                </h1>
              </div>
            </div>

            <div className="flex items-center px-5 py-8 sm:px-8 sm:py-10">
              <Card className="w-full border-none bg-transparent shadow-none">
                <CardHeader className="space-y-3 px-0 pb-4 pt-0">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-red">Acesso do funcionário</p>
                    <CardTitle className="text-3xl font-semibold leading-tight text-brand-black">
                      Entrar na ferramentaria
                    </CardTitle>
                    <CardDescription className="max-w-sm text-sm leading-6 text-gray-500">
                      Digite a matrícula e a senha numérica para continuar.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="px-0 pb-0 pt-2">
                  <form className="space-y-4" onSubmit={handleLogin}>
                    <div className="space-y-2">
                      <Label htmlFor="profile-picker">Perfil</Label>
                      <div className="relative">
                        <div className="relative">
                          {selectedProfile && !profileMenuOpen && (
                            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-brand-black text-xs font-bold text-white">
                                {selectedProfile.photoUrl ? (
                                  <Image
                                    src={selectedProfile.photoUrl}
                                    alt={selectedProfile.name}
                                    fill
                                    sizes="36px"
                                    className="object-cover"
                                    unoptimized={
                                      selectedProfile.photoUrl.startsWith('data:') ||
                                      selectedProfile.photoUrl.startsWith('blob:')
                                    }
                                  />
                                ) : (
                                  getInitials(selectedProfile.name)
                                )}
                              </div>
                            </div>
                          )}

                          <Input
                            id="profile-picker"
                            value={profileMenuOpen ? profileSearch : selectedProfile ? selectedProfile.name : profileSearch}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              const nextBadge = nextValue.replace(/\D/g, '');

                              setProfileSearch(nextValue);
                              setProfileMenuOpen(true);
                              setBadge(nextBadge);
                              setLoginError('');
                            }}
                            onFocus={() => {
                              setProfileMenuOpen(true);
                              if (selectedProfile && profileSearch === '') {
                                setProfileSearch(selectedProfile.name);
                              }
                            }}
                            placeholder="Digite seu nome ou matrícula"
                            className={cn(
                              'h-[58px] rounded-2xl pr-12 text-base',
                              selectedProfile && !profileMenuOpen && 'pl-16'
                            )}
                            autoComplete="off"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setProfileMenuOpen((current) => !current);
                              if (!profileMenuOpen) {
                                setProfileSearch(selectedProfile ? selectedProfile.name : '');
                              }
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-400"
                            aria-label="Abrir seleção de perfil"
                          >
                            {profileMenuOpen ? '−' : '+'}
                          </button>
                        </div>

                        {profileMenuOpen && (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-y-auto rounded-2xl border border-brand-gray-border bg-white p-2 shadow-[0_24px_40px_-28px_rgba(10,10,10,0.35)]">
                        {filteredProfiles.map((profile) => (
                              <button
                                key={profile.id}
                                type="button"
                                onClick={() => {
                                  setBadge(profile.badge);
                                  setProfileSearch(profile.name);
                                  setProfileMenuOpen(false);
                                  setLoginError('');
                                }}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-brand-gray-light',
                                  selectedProfile?.id === profile.id && 'bg-red-50'
                                )}
                              >
                                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-black text-xs font-bold text-white">
                                  {profile.photoUrl ? (
                                    <Image
                                      src={profile.photoUrl}
                                      alt={profile.name}
                                      fill
                                      sizes="40px"
                                      className="object-cover"
                                      unoptimized={profile.photoUrl.startsWith('data:') || profile.photoUrl.startsWith('blob:')}
                                    />
                                  ) : (
                                    getInitials(profile.name)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-brand-black">{profile.name}</p>
                                  <p className="truncate text-xs text-gray-500">Matricula {profile.badge}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha de 6 números</Label>
                      <Input
                        id="password"
                        type="password"
                        inputMode="numeric"
                        placeholder="000000"
                        value={password}
                        onChange={(event) => setPassword(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        autoComplete="current-password"
                        className="h-12 rounded-2xl text-base"
                      />
                    </div>

                    {wasTimedOut && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Sessão encerrada por inatividade. Faça login novamente para continuar.
                      </div>
                    )}

                    {loginError && (
                      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-red">
                        {loginError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-2xl text-base font-semibold"
                      disabled={loginLoading || badge.trim() === '' || password.length !== 6}
                    >
                      {loginLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>

                  <div className="mt-5 rounded-2xl bg-brand-gray-light px-4 py-3 text-sm leading-6 text-gray-500">
                    Em caso de tela parada, o acesso e encerrado automaticamente apos alguns minutos sem uso.
                  </div>

                  {badge.trim() === SUPREME_ADMIN_BADGE && !selectedProfile && (
                    <div className="mt-3 rounded-2xl border border-brand-gray-border bg-white px-4 py-3 text-sm leading-6 text-gray-500">
                      Conta administrativa protegida detectada. Informe a senha para continuar.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-brand-black">{employee.name}</h1>
            <p className="truncate text-sm text-gray-500">
              {SHIFT_LABEL[employee.shift]} • Matricula {employee.badge}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <ProgressBadge label="Escolha" active />
            <ProgressBadge label="Confirmação" active={step === 'confirm' || step === 'success'} />
            <ProgressBadge label="Concluído" active={step === 'success'} />
          </div>
        </div>

        {step === 'tool' && (
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="rounded-3xl border border-brand-gray-border bg-white">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle className="text-xl">Buscar ferramenta</CardTitle>
                <CardDescription>Encontre pelo nome ou código.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="tool-search">Ferramenta</Label>
                  <Input
                    id="tool-search"
                    placeholder="Ex.: furadeira"
                    value={searchTool}
                    onChange={(event) => setSearchTool(event.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>

                <div className="rounded-2xl bg-brand-gray-light px-4 py-3">
                  <p className="text-sm font-medium text-brand-black">{visibleTools.length} item(ns) encontrado(s)</p>
                  <p className="mt-1 text-sm text-gray-500">Itens indisponíveis continuam visíveis com a situação atual.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-brand-gray-border bg-white">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle className="text-xl">Selecionar ferramenta</CardTitle>
                <CardDescription>Toque no card da ferramenta para continuar.</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {visibleTools.length === 0 ? (
                  <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-brand-gray-border bg-brand-gray-light/60 px-6 text-center">
                    <div>
                      <p className="text-lg font-semibold text-brand-black">Nenhuma ferramenta encontrada</p>
                      <p className="mt-2 text-sm text-gray-500">Tente outro nome ou código.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleTools.map((tool) => {
                      const disabled = !tool.available || tool.condition === 'maintenance';
                      const status = getToolStatus(tool);

                      return (
                      <button
                        key={tool.id}
                        onClick={() => handleSelectTool(tool)}
                        disabled={disabled}
                        className={cn(
                          'rounded-2xl border border-brand-gray-border bg-white p-4 text-left transition-all duration-150',
                          disabled
                            ? 'cursor-not-allowed opacity-80'
                            : 'hover:border-brand-red hover:bg-red-50/40'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
                            disabled ? 'bg-gray-100' : 'bg-brand-gray-light'
                          )}>
                            <ToolIcon category={tool.category} size={28} color="#DC2626" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-5 text-brand-black">{tool.name}</p>
                            <p className="mt-1 font-mono text-xs font-bold text-brand-red">{tool.code}</p>
                            <p className="mt-2 text-xs text-gray-500">{CATEGORY_LABEL[tool.category]}</p>
                            <p className="mt-1 text-xs text-gray-400">{tool.location}</p>
                            <span className={cn('mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium', status.className)}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </button>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'confirm' && selectedTool && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border border-brand-gray-border bg-white">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle className="text-xl">Ferramenta selecionada</CardTitle>
                <CardDescription>Confira os dados antes de confirmar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5 pt-0">
                <div className="flex h-44 items-center justify-center rounded-3xl bg-brand-gray-light">
                  <ToolIcon category={selectedTool.category} size={104} color="#0A0A0A" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-brand-black">{selectedTool.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{selectedTool.description}</p>
                </div>

                <div className="rounded-2xl border border-brand-gray-border bg-white px-4 py-3">
                  <DataRow label="Código" value={selectedTool.code} mono />
                  <DataRow label="Categoria" value={CATEGORY_LABEL[selectedTool.category]} />
                  <DataRow label="Localização" value={selectedTool.location} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-brand-gray-border bg-white">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle className="text-xl">Confirmar retirada</CardTitle>
                <CardDescription>O registro será feito no seu nome.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 pt-0">
                <div className="rounded-2xl bg-brand-gray-light px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-gray-border bg-brand-black text-sm font-bold text-white">
                      {employee.photoUrl ? (
                        <Image
                          src={employee.photoUrl}
                          alt={employee.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized={employee.photoUrl.startsWith('data:') || employee.photoUrl.startsWith('blob:')}
                        />
                      ) : (
                        getInitials(employee.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-black">{employee.name}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {ROLE_LABEL[employee.role]} • {employee.badge} • {SHIFT_LABEL[employee.shift]}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected-return-time">Hora prevista de devolução</Label>
                  <Input
                    id="expected-return-time"
                    type="time"
                    value={expectedReturnTime}
                    onChange={(event) => setExpectedReturnTime(event.target.value)}
                    className="h-11 rounded-2xl"
                  />
                  <p className="text-xs text-gray-500">
                    Escolha um horário dentro do dia de hoje para prever a devolução da ferramenta.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cost-center">Centro de Custo</Label>
                    <Input
                      id="cost-center"
                      placeholder="P2-PN01"
                      value={costCenter}
                      onChange={(event) => setCostCenter(event.target.value.toUpperCase())}
                      className="h-11 rounded-2xl uppercase"
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                    <p className="text-xs text-gray-500">
                      Informe onde a ferramenta será utilizada.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-order">Ordem de Serviço</Label>
                    <Input
                      id="service-order"
                      placeholder="12345"
                      value={serviceOrder}
                      onChange={(event) => setServiceOrder(event.target.value.toUpperCase())}
                      className="h-11 rounded-2xl uppercase"
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                    <p className="text-xs text-gray-500">
                      Informe a OS relacionada a retirada.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-brand-red">
                  A ferramenta deve ser devolvida todo dia na data prevista ou no fim do turno.
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-red">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setStep('tool')}>
                    Voltar
                  </Button>
                  <Button className="flex-1 rounded-2xl" onClick={handleConfirm} disabled={submitting}>
                    {submitting ? 'Registrando...' : 'Confirmar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'success' && selectedTool && (
          <Card className="mx-auto w-full max-w-2xl rounded-3xl border border-brand-gray-border bg-white">
            <CardContent className="space-y-6 p-6 text-center sm:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-red text-white">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-red">Retirada concluída</p>
                <h2 className="mt-2 text-2xl font-semibold text-brand-black">Registro feito com sucesso</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {employee.name} retirou <span className="font-semibold text-brand-black">{selectedTool.name}</span>.
                </p>
              </div>

              <div className="rounded-2xl bg-brand-gray-light px-4 py-4 text-left">
                <DataRow label="Funcionário" value={employee.name} />
                <DataRow label="Matrícula" value={employee.badge} mono />
                <DataRow label="Ferramenta" value={selectedTool.name} />
                <DataRow label="Código" value={selectedTool.code} mono />
                <DataRow label="Centro de Custo" value={costCenter || '—'} />
                <DataRow label="Ordem de Serviço" value={serviceOrder || '—'} />
                <DataRow label="Devolução prevista" value={expectedReturnTime || '—'} mono />
              </div>

              <Link
                href="/devolucao"
                className="inline-flex text-sm font-medium text-brand-red underline-offset-4 hover:underline"
              >
                Ir para devolução agora
              </Link>

              <p className="text-sm text-gray-500">
                Redirecionando automaticamente para devolução em 5 segundos.
              </p>

              <Button className="w-full rounded-2xl" onClick={handleNewWithdrawal}>
                Fazer nova retirada
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getDefaultExpectedReturnTime() {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

  if (nextHour.getDate() !== now.getDate()) {
    return '23:59';
  }

  return `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;
}

function ProgressBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        'text-sm font-medium transition-colors',
        active ? 'text-brand-red' : 'text-gray-400'
      )}
    >
      {label}
    </span>
  );
}

function DataRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brand-gray-border py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <span className={cn('text-sm font-medium text-brand-black text-right', mono && 'font-mono text-brand-red')}>
        {value}
      </span>
    </div>
  );
}
