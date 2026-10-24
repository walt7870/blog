export function createPartitions(fault = 8) {
  return { fault, months: Array(12).fill('pending'), calls: 0, session: 1, queried: false,
    aggregated: false, reused: 0, message: '十二个月尚未查询，全年汇总等待分区证据。' }
}

export function partitionAction(state, action) {
  const next = { ...state, months: [...state.months] }
  if (action === 'query' && !state.queried) {
    next.months = state.months.map((_, i) => i + 1 < state.fault ? 'verified' : i + 1 === state.fault ? 'failed' : 'pending')
    next.calls += state.fault
    next.queried = true
    next.message = state.fault === 1 ? '1 月查询超时，尚无已验证分区，其余月份未执行。'
      : `${state.fault} 月查询超时；前 ${state.fault - 1} 个月的证据已保存，其余月份未执行。`
  } else if (action === 'handoff') {
    next.session++
    next.message = `会话 ${next.session} 读取原检查点；已核对 ${state.months.filter(m => m === 'verified').length} 个月，累计查询次数保持 ${state.calls}。`
  } else if (action === 'retry' && state.queried && state.months.some(m => m !== 'verified')) {
    next.reused = state.months.filter(m => m === 'verified').length
    next.calls += 12 - next.reused
    next.months.fill('verified')
    next.message = `复用 ${next.reused} 个月，只补查 ${12 - next.reused} 个月；十二份分区证据齐全，全年汇总可执行。`
  } else if (action === 'aggregate') {
    if (state.months.every(m => m === 'verified')) {
      next.aggregated = true
      next.message = '全年数量与十二个月之和核对通过；异常解释、报告验收和归档仍需各自的证据。'
    } else next.message = '拒绝聚合：必需分区不齐，不能生成全年成功结论。'
  }
  return next
}

const archiveStages = [
  { local: 'ready', remote: '尚无归档', action: '保存操作意图', note: '先固定报告内容、版本和归档授权。' },
  { local: 'unknown', remote: '尚无归档', action: '提交并丢失响应', note: '操作键与参数摘要已落盘；即使进程消失，也知道要回查哪个操作。' },
  { local: 'unknown', remote: '报告已保存', action: '新会话接手', note: '服务端已完成写入，执行端未收到响应；unknown 只表示客户端无法确认结果。' },
  { local: 'unknown', remote: '报告已保存', action: '回查原操作', note: '新会话读取旧键；会话身份变了，逻辑操作身份没有变。' },
  { local: 'verifying', remote: '报告已保存', action: '回读并验证报告', note: '原操作已成功；仍需回读并核对报告内容、归属、权限和版本。' },
  { local: 'succeeded', remote: '报告已保存', action: '', note: '同一报告通过回读验证；没有新增归档。' },
]

export function archiveFrame(step = 0, policy = 'query') {
  const position = Math.max(0, Math.min(5, step))
  const repeated = policy === 'repeat' && position >= 4
  const frame = { ...archiveStages[position], step: position,
    count: position >= 2 ? repeated ? 2 : 1 : 0,
    key: repeated ? 'archive-02' : 'archive-01',
    report: position >= 4 ? repeated ? 'report-2' : 'report-1' : '尚未确认',
    session: position >= 3 ? 2 : 1, repeated }
  if (policy === 'repeat' && position === 3) frame.action = '换新键再次提交'
  if (repeated) {
    frame.remote = '两份报告都已保存'
    frame.note = position === 4
      ? '新键被视为另一笔操作。原报告仍然存在，服务端因此多保存了一份。'
      : '新报告回读成功，旧报告也已生效；客户端的 succeeded 掩盖了重复副作用。'
  }
  return frame
}

export function createBudget() {
  return { limit: 6, used: 1, unchanged: 0, evidence: 0, session: 1,
    remote: 'running', cancellation: '', paused: false,
    message: '已提交一个远端作业，消耗 1 次业务调用；等待它返回。' }
}

export function budgetStatus(state) {
  if (state.cancellation) return state.cancellation
  if (state.used >= state.limit) return 'exhausted'
  if (state.paused) return 'stalled'
  return 'running'
}

export function budgetAction(state, action) {
  const next = { ...state }
  if (action === 'handoff') {
    next.session++
    next.message = `切换到会话 ${next.session}；已用 ${state.used}/${state.limit} 次，取消与停滞状态也一并保留。`
  } else if (action === 'cancel' && !state.cancellation) {
    next.cancellation = 'cancel_requested'
    next.message = '已停止新调度并登记取消请求；远端仍在运行，尚不能标记 cancelled。'
  } else if (action === 'confirm' && state.cancellation === 'cancel_requested') {
    next.cancellation = 'cancelled'
    next.remote = 'stopped'
    next.message = '模拟远端确认停止，取消完成；已经发生的副作用仍需单独核查和补偿。'
  } else if (action === 'replan' && budgetStatus(state) === 'stalled') {
    next.paused = false
    next.unchanged = 0
    next.message = '已修正计划；恢复调度，原预算与已用额度继续累计。'
  } else if (['progress', 'repeat'].includes(action) && budgetStatus(state) === 'running') {
    next.used++
    next.unchanged = action === 'repeat' ? state.unchanged + 1 : 0
    next.evidence += action === 'progress' ? 1 : 0
    next.paused = next.unchanged >= 3
    next.message = next.used >= next.limit ? '业务调用额度耗尽；停止新调度，保存状态并核查在途作业。'
      : next.paused ? '连续三次相同查询没有新证据或作业进度，先停止并诊断。'
        : action === 'progress' ? '取得一项新证据；使用了 1 次调用，任务向前推进。'
          : `相同查询没有变化，连续 ${next.unchanged} 次；仍消耗 1 次调用。`
  }
  return next
}
