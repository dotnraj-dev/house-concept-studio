import type { Asset, Project, Settings, User } from './types';

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { demoApi } = await import('./demoApi');
    return demoApi<T>(url, options);
  }
  const response = await fetch(`/api${url}`, {
    credentials: 'same-origin',
    ...options,
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type':'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
export const getMe = () => api<{user:User}>('/me');
export const login = (email:string,password:string) => api<{user:User}>('/login',{method:'POST',body:JSON.stringify({email,password})});
export const logout = () => api('/logout',{method:'POST'});
export const changePassword = (currentPassword:string,newPassword:string) => api('/me/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});
export const getProjects = () => api<{projects:Project[]}>('/projects');
export const saveProject = (project:Project) => api<{project:Project}>(project.id ? `/projects/${project.id}` : '/projects', {
  method: project.id ? 'PATCH' : 'POST', body:JSON.stringify(project),
});
export const getUsers = () => api<{users:User[]}>('/users');
export const createUser = (data:{name:string;email:string;password:string;permissions:string[]}) => api<{user:User}>('/users',{method:'POST',body:JSON.stringify(data)});
export const updateUser = (user:User, password?:string) => api<{user:User}>(`/users/${user.id}`,{method:'PATCH',body:JSON.stringify({name:user.name,active:user.active,permissions:user.permissions,...(password ? {password} : {})})});
export const getSettings = () => api<{settings:Settings}>('/settings');
export const updateSettings = (settings:Settings) => api<{settings:Settings}>('/settings',{method:'PATCH',body:JSON.stringify(settings)});
export const getAssets = () => api<{assets:Asset[]}>('/assets');
export const uploadAsset = (form:FormData) => api<{asset:Asset}>('/assets',{method:'POST',body:form});
export const extractRequirements = (text:string,useAI=false) => api<{fields:{key:string;value:string}[];questions:string[];summary:string;usage?:unknown}>('/extract',{method:'POST',body:JSON.stringify({text,useAI})});
export const transcribe = (audio:Blob) => { const form = new FormData(); const extension=audio.type.includes('mp4')?'mp4':audio.type.includes('ogg')?'ogg':'webm'; form.append('file',audio,`answer.${extension}`); return api<{text:string;languages:{code:string}[]}>('/transcribe',{method:'POST',body:form}); };
