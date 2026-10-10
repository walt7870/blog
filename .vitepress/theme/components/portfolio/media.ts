export type ProjectMedia = { id: string; label: string; kind?: 'flow' };
export const projectMedia: Record<string, ProjectMedia[]> = {
  'amphion-cloud': [{ id: 'amphion-cloud', label: '开发者控制台 · 用量与消费趋势' }, { id: 'cloud-entitlements', label: '企业控制台 · 权益与授权' }, { id: 'cloud-licenses', label: '企业控制台 · 离线许可证' }, { id: 'cloud-devices', label: '企业控制台 · 在线激活与设备' }],
  'memo-ai': [{ id: 'memo-ai', label: '实时转写与会议笔记' }, { id: 'memo-workspace', label: '录音恢复与文件转写工作台' }],
  'voice-platform': [{ id: 'voice-platform', label: '应用配置与原生语音资源' }, { id: 'voice-experience', label: '语音会话与播放恢复' }],
  commerce: [{ id: 'commerce', label: '商品管理与渠道映射' }, { id: 'commerce-app', label: '移动端商品与购物车入口' }],
  'private-asr': [{ id: 'private-asr', label: '语音调试 · 文件回放与逐句结果' }],
  'speech-sdk': [{ id: 'speech-sdk', label: 'Android 离线语音识别 Demo' }, { id: 'sdk-tts', label: 'Android 离线语音合成 Demo' }],
  'materials-website': [{ id: 'materials-website', label: '材料详情 · 参数与实物展示' }],
  'speech-playground': [{ id: 'speech-playground', label: '模型对比与热词体验工作台' }],
  'feishu-workflow': [{ id: 'feishu-workflow', label: '任务编排与确认执行', kind: 'flow' }],
  'gitlab-platform': [{ id: 'gitlab-platform', label: 'GitLab 实例与代码迁移链路', kind: 'flow' }],
  'delivery-platform': [{ id: 'delivery-platform', label: '制品晋级与发布信任边界', kind: 'flow' }],
  'sub2api-platform': [{ id: 'sub2api-platform', label: '内部客户端与模型接入链路', kind: 'flow' }],
};
