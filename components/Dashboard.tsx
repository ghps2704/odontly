
import React, { useMemo } from 'react';
import { useNexus } from '../store/NexusContext';
import { ArrowUpRight, AlertTriangle, TrendingDown, Clock, BarChart3, TrendingUp, DollarSign, PieChart as PieIcon, Activity, UserPlus, Users, Wallet, Trophy, ShoppingBag, Gauge, Heart, ThumbsUp } from 'lucide-react';
import { ViewState } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart, Treemap, ComposedChart, Line } from 'recharts';

const Dashboard: React.FC<{ onNavigate: (view: ViewState) => void }> = ({ onNavigate }) => {
  const { transactions, items, accounts, appointments, contacts, settings, professionals } = useNexus();

  // 1. REVENUE HISTORY (Last 6 Months)
  const revenueHistory = useMemo(() => {
      const data = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
          const year = d.getFullYear();
          
          const monthIncome = transactions.filter(t => {
              const tDate = new Date(t.date);
              return t.type === 'INCOME' && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === year;
          }).reduce((acc, t) => acc + t.amount, 0);

           const monthExpense = transactions.filter(t => {
              const tDate = new Date(t.date);
              return t.type === 'EXPENSE' && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === year;
          }).reduce((acc, t) => acc + t.amount, 0);

          data.push({
              name: monthName,
              Receita: monthIncome,
              Despesa: monthExpense,
              Lucro: monthIncome - monthExpense
          });
      }
      return data;
  }, [transactions]);

  // 2. CASH FLOW FORECAST (30 Days Projection)
  const forecastData = useMemo(() => {
     let currentBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
     const today = new Date();
     const next30Days = new Date();
     next30Days.setDate(today.getDate() + 30);

     const futureTxs = transactions
        .filter(t => t.status === 'PENDING' && new Date(t.date) >= today && new Date(t.date) <= next30Days)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     
     const data = [{ name: 'Hoje', Saldo: currentBalance }];
     
     futureTxs.forEach(tx => {
         if (tx.type === 'INCOME') currentBalance += tx.amount;
         else currentBalance -= tx.amount;
         
         data.push({
             name: new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
             Saldo: currentBalance
         });
     });
     
     return data;
  }, [transactions, accounts]);

  // 3. PAYMENT MIX (Donut Chart)
  const paymentMixData = useMemo(() => {
      const mix: Record<string, number> = {};
      transactions
        .filter(t => t.type === 'INCOME' && t.status === 'PAID')
        .forEach(t => {
            const method = t.paymentMethod || 'OUTRO';
            mix[method] = (mix[method] || 0) + t.amount;
        });
      
      return Object.entries(mix).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // 4. UNIT ECONOMICS (KPIs)
  const kpis = useMemo(() => {
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      const marketingExpenses = transactions
        .filter(t => 
            t.type === 'EXPENSE' && 
            (t.category.toLowerCase().includes('marketing') || t.category.toLowerCase().includes('publicidade')) &&
            new Date(t.date) >= sixMonthsAgo
        ).reduce((acc, t) => acc + t.amount, 0);

      const newClientsCount = contacts.filter(c => {
          if (c.type === 'SUPPLIER') return false;
          const clientAppts = appointments.filter(a => a.clientId === c.id);
          if (clientAppts.length === 0) return false; 
          const firstApptDate = new Date(clientAppts[0].date);
          return firstApptDate >= sixMonthsAgo;
      }).length;

      const cac = newClientsCount > 0 ? marketingExpenses / newClientsCount : 0;

      const totalRevenue = transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
      const uniquePayingClients = new Set(transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID' && t.contactId).map(t => t.contactId)).size;
      const ltv = uniquePayingClients > 0 ? totalRevenue / uniquePayingClients : 0;

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);
      
      const activeClientsSet = new Set(appointments
        .filter(a => new Date(a.date) >= ninetyDaysAgo)
        .map(a => a.clientId)
      );
      
      const totalEngagedClients = new Set(appointments.map(a => a.clientId)).size;
      const churnRate = totalEngagedClients > 0 
        ? ((totalEngagedClients - activeClientsSet.size) / totalEngagedClients) * 100 
        : 0;

      return { cac, ltv, churnRate };
  }, [transactions, appointments, contacts]);


  // 5. ABC ANALYSIS TREEMAP
  const abcTreemapData = useMemo(() => {
    const stockItems = items.filter(i => i.type !== 'SERVICE');
    const totalValue = stockItems.reduce((acc, i) => acc + (i.cost * i.stock), 0);
    const sorted = [...stockItems].sort((a, b) => (b.cost * b.stock) - (a.cost * a.stock));

    const thresholds = settings.abcThresholds || { a: 70, b: 20, c: 10 };
    
    // Define exact colors to match legend classes (Tailwind colors)
    const colors = ['#10B981', '#F59E0B', '#94A3B8']; // Emerald-500, Amber-500, Slate-400

    let accumulated = 0;
    const data = [
        { name: 'Classe A', children: [] as any[] },
        { name: 'Classe B', children: [] as any[] },
        { name: 'Classe C', children: [] as any[] }
    ];

    sorted.forEach(item => {
        const itemVal = item.cost * item.stock;
        if (itemVal <= 0) return;

        accumulated += itemVal;
        const pct = (accumulated / totalValue) * 100;
        
        let targetIndex = 2; // C
        if (pct <= thresholds.a) targetIndex = 0; // A
        else if (pct <= (thresholds.a + thresholds.b)) targetIndex = 1; // B

        data[targetIndex].children.push({
            name: item.name,
            size: itemVal,
            value: itemVal,
            nodeColor: colors[targetIndex] // Inject color explicitly
        });
    });

    return data.filter(d => d.children.length > 0);
  }, [items, settings.abcThresholds]);

  // 6. PERFORMANCE CHARTS (Professional & Product)
  const performanceData = useMemo(() => {
      const profMap: Record<string, { 
          name: string, 
          revenue: number, 
          appointmentsCount: number, 
          productsCount: number 
      }> = {};
      
      const itemMap: Record<string, { name: string, value: number, count: number }> = {};

      appointments
        .filter(a => a.status === 'COMPLETED')
        .forEach(appt => {
            const profId = appt.professionalId;
            const profName = professionals.find(p => p.id === profId)?.name || 'Profissional Removido';
            
            if (!profMap[profId]) {
                profMap[profId] = { 
                    name: profName, 
                    revenue: 0, 
                    appointmentsCount: 0, 
                    productsCount: 0 
                };
            }
            
            // 1. Increment Appointments
            profMap[profId].appointmentsCount += 1;

            if (appt.items) {
                appt.items.forEach(itm => {
                    const lineTotal = itm.quantity * itm.unitPrice;
                    const itemDef = items.find(i => i.id === itm.itemId);
                    
                    // 2. Calculate Revenue
                    profMap[profId].revenue += lineTotal;

                    // 3. Increment Products Sold
                    if (itemDef?.type === 'PRODUCT') {
                        profMap[profId].productsCount += itm.quantity;
                    }

                    const itemName = itemDef?.name || 'Item Removido';
                    if(!itemMap[itm.itemId]) itemMap[itm.itemId] = { name: itemName, value: 0, count: 0 };
                    itemMap[itm.itemId].value += lineTotal;
                    itemMap[itm.itemId].count += itm.quantity;
                });
            }
        });

      const profChart = Object.values(profMap).sort((a,b) => b.revenue - a.revenue);
      const itemChart = Object.values(itemMap).sort((a,b) => b.value - a.value).slice(0, 10);

      return { profChart, itemChart };
  }, [appointments, professionals, items]);

  // 7. OPERATIONAL METRICS (RF027, RF028, RF032)
  const opsMetrics = useMemo(() => {
      // 1. Occupancy Rate (Simplification: Based on active professionals * 8h/day * 22 days)
      const activeProfs = professionals.filter(p => p.active).length;
      const totalCapacityHours = activeProfs * 8 * 22; // Monthly capacity
      
      const currentMonth = new Date().getMonth();
      const bookedHours = appointments
        .filter(a => new Date(a.date).getMonth() === currentMonth && a.status !== 'CANCELLED')
        .reduce((acc, a) => acc + (a.durationMinutes / 60), 0);
        
      const occupancyRate = totalCapacityHours > 0 ? (bookedHours / totalCapacityHours) * 100 : 0;

      // 2. NPS
      const ratedAppts = appointments.filter(a => a.npsScore !== undefined);
      const avgNps = ratedAppts.length > 0 
        ? ratedAppts.reduce((acc, a) => acc + (a.npsScore || 0), 0) / ratedAppts.length 
        : 0;

      // 3. Variance (Estimated vs Real Materials)
      // This requires comparing appt.customMaterials vs appt.items BOM
      // For simplicity in this view, we'll just sum the value of 'customMaterials' used in completed appointments this month
      const totalWasteValue = appointments
        .filter(a => a.status === 'COMPLETED' && new Date(a.date).getMonth() === currentMonth && a.customMaterials)
        .reduce((acc, a) => {
            // Calculate Cost of Custom Materials
            const realCost = a.customMaterials?.reduce((sum, mat) => {
                const item = items.find(i => i.id === mat.itemId);
                return sum + (item ? item.cost * mat.quantity : 0);
            }, 0) || 0;
            
            // Calculate Expected Cost
            const expectedCost = a.items.reduce((sum, saleItem) => {
                const itemDef = items.find(i => i.id === saleItem.itemId);
                if (itemDef?.bom) {
                    const bomCost = itemDef.bom.reduce((bSum, bItem) => {
                        const comp = items.find(k => k.id === bItem.itemId);
                        return bSum + (comp ? comp.cost * bItem.quantity : 0);
                    }, 0);
                    return sum + (bomCost * saleItem.quantity);
                }
                return sum;
            }, 0);

            return acc + (realCost - expectedCost);
        }, 0);

      return { occupancyRate, avgNps, totalWasteValue };
  }, [appointments, professionals, items]);

  const revenue = transactions
    .filter(t => t.type === 'INCOME' && t.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const profit = revenue - transactions
    .filter(t => t.type === 'EXPENSE' && t.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const lowStockItems = items.filter(i => i.type !== 'SERVICE' && i.stock <= i.minStock);

  const Card = ({ title, value, subtext, icon: Icon, colorClass, onClick }: any) => (
    <div 
        onClick={onClick}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-800">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon size={20} />
        </div>
      </div>
      {subtext && <p className="text-xs mt-3 text-slate-400">{subtext}</p>}
    </div>
  );

  const CustomTreemapContent = (props: any) => {
    const { depth, x, y, width, height, name, nodeColor } = props;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: depth === 1 ? 'transparent' : nodeColor, // Use the injected nodeColor
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {depth === 1 ? (
          <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="bold">{name}</text>
        ) : null}
        {depth === 2 && width > 30 && height > 20 ? (
           <text x={x + 4} y={y + 14} fill="#fff" fontSize={10} fillOpacity={0.9} style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>{name}</text>
        ) : null}
      </g>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
        <p className="text-slate-500">Bem-vindo ao Sozio ERP. Visão geral da sua operação.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Receita Acumulada" value={`R$ ${revenue.toFixed(2)}`} subtext="Regime de Caixa" icon={ArrowUpRight} colorClass="bg-emerald-100 text-emerald-600" onClick={() => onNavigate('FINANCE')} />
        <Card title="Lucro Líquido" value={`R$ ${profit.toFixed(2)}`} subtext={`Margem Real: ${revenue > 0 ? ((profit/revenue)*100).toFixed(1) : 0}%`} icon={ArrowUpRight} colorClass="bg-blue-100 text-blue-600" onClick={() => onNavigate('FINANCE')} />
        <Card title="Estoque Crítico" value={lowStockItems.length} subtext="Itens abaixo do mínimo" icon={AlertTriangle} colorClass="bg-red-100 text-red-600" onClick={() => onNavigate('CATALOG')} />
        <Card title="Saldo em Contas" value={`R$ ${accounts.reduce((a,b)=>a+b.balance,0).toFixed(2)}`} subtext="Tesouraria Consolidada" icon={Wallet} colorClass="bg-indigo-100 text-indigo-600" onClick={() => onNavigate('FINANCE')} />
      </div>

      {/* --- NEW MODULE 07: OPERATIONAL EFFICIENCY --- */}
      <div>
          <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <Gauge className="text-teal-600" size={20} />
                Eficiência Operacional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Occupancy */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-teal-50 rounded-full text-teal-600">
                      <Clock size={24} />
                  </div>
                  <div>
                      <p className="text-sm font-medium text-slate-500">Ocupação da Agenda</p>
                      <h4 className="text-2xl font-bold text-slate-800">{opsMetrics.occupancyRate.toFixed(1)}%</h4>
                      <p className="text-xs text-slate-400">Horas Vendidas / Capacidade</p>
                  </div>
              </div>

              {/* Variance / Waste */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className={`p-3 rounded-full ${opsMetrics.totalWasteValue > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      <TrendingDown size={24} />
                  </div>
                  <div>
                      <p className="text-sm font-medium text-slate-500">Variância de Insumos</p>
                      <h4 className={`text-2xl font-bold ${opsMetrics.totalWasteValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {opsMetrics.totalWasteValue > 0 ? '+' : ''} R$ {opsMetrics.totalWasteValue.toFixed(2)}
                      </h4>
                      <p className="text-xs text-slate-400">Diferença Real vs. Ficha Técnica</p>
                  </div>
              </div>

              {/* NPS */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-full text-amber-500">
                      <Heart size={24} />
                  </div>
                  <div>
                      <p className="text-sm font-medium text-slate-500">NPS Médio (Satisfação)</p>
                      <div className="flex items-baseline gap-2">
                          <h4 className="text-2xl font-bold text-slate-800">{opsMetrics.avgNps.toFixed(1)}</h4>
                          <span className="text-xs text-slate-400">/ 10</span>
                      </div>
                      <p className="text-xs text-slate-400">Baseado em avaliações no checkout</p>
                  </div>
              </div>
          </div>
      </div>

      {/* KPI SECTION */}
      <div>
          <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                <Activity className="mr-2 text-purple-600" size={20} />
                Economia Unitária (KPIs)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-500">CAC (Custo Aquisição)</span>
                      <UserPlus size={18} className="text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">R$ {kpis.cac.toFixed(2)}</div>
                  <p className="text-xs text-slate-400 mt-1">Mkt / Novos Clientes (6m)</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-500">LTV (Lifetime Value)</span>
                      <DollarSign size={18} className="text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">R$ {kpis.ltv.toFixed(2)}</div>
                  <p className="text-xs text-slate-400 mt-1">Receita Média Vitalícia</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-500">Churn Rate (Taxa de Saída)</span>
                      <Users size={18} className="text-red-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{kpis.churnRate.toFixed(1)}%</div>
                  <p className="text-xs text-slate-400 mt-1">Inativos &gt; 90 dias</p>
              </div>
          </div>
      </div>

      {/* PERFORMANCE SECTION (Dual Axis Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
              <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                  <Trophy className="mr-2 text-amber-500" size={20} />
                  Performance por Profissional
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={performanceData.profChart} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} />
                      
                      <Tooltip formatter={(val: number, name: string) => [
                          name === 'Receita Gerada' ? `R$ ${val.toFixed(2)}` : val, 
                          name
                      ]} />
                      <Legend />
                      
                      <Bar yAxisId="left" dataKey="revenue" name="Receita Gerada" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar yAxisId="right" dataKey="appointmentsCount" name="Atendimentos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar yAxisId="right" dataKey="productsCount" name="Produtos Vendidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                  </ComposedChart>
              </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
              <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                  <ShoppingBag className="mr-2 text-emerald-500" size={20} />
                  Top 10 Produtos & Serviços
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={performanceData.itemChart} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                      <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(val: number, name: string) => [name === 'Quantidade' ? `${val} un` : `R$ ${val.toFixed(2)}`, name]} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="value" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                      <Line yAxisId="right" dataKey="count" name="Quantidade" type="monotone" stroke="#ef4444" strokeWidth={2} dot={{r: 3}} />
                  </ComposedChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* BI SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* REVENUE CHART */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
            <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                <BarChart3 className="mr-2 text-blue-500" size={20} />
                Faturamento Mensal (DRE)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* CASH FLOW FORECAST */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
            <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                <TrendingUp className="mr-2 text-emerald-500" size={20} />
                Projeção de Caixa (30 Dias)
            </h3>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                    <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Saldo Previsto']} />
                    <Area type="monotone" dataKey="Saldo" stroke="#10b981" fillOpacity={1} fill="url(#colorSaldo)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
        {/* PAYMENT MIX */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96 lg:col-span-1">
            <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                <DollarSign className="mr-2 text-indigo-500" size={20} />
                Mix de Recebimentos
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={paymentMixData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {paymentMixData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>

        {/* ABC Curve Treemap */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96 lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-slate-800 flex items-center">
                    <PieIcon className="mr-2 text-slate-500" size={20} />
                    Curva ABC (Estoque)
                </h3>
                <div className="flex gap-2 text-xs">
                     <span className="flex items-center"><div className="w-3 h-3 bg-emerald-500 mr-1 rounded-sm"></div> A ({settings.abcThresholds?.a}%)</span>
                     <span className="flex items-center"><div className="w-3 h-3 bg-amber-500 mr-1 rounded-sm"></div> B ({settings.abcThresholds?.b}%)</span>
                     <span className="flex items-center"><div className="w-3 h-3 bg-slate-400 mr-1 rounded-sm"></div> C ({settings.abcThresholds?.c}%)</span>
                </div>
            </div>
            
            <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={abcTreemapData}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        content={<CustomTreemapContent />}
                    >
                         <Tooltip formatter={(value: any) => `R$ ${value.toFixed(2)}`} />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
