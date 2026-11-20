// Some restricted Windows runners cannot resolve the account through libuv.
// tsx needs only the username for its temporary IPC path during tests.
const os = require('node:os');
const nativeUserInfo = os.userInfo;

os.userInfo = function userInfo(options) {
  try {
    return nativeUserInfo(options);
  } catch (error) {
    if (process.platform !== 'win32' || error?.syscall !== 'uv_os_get_passwd') {
      throw error;
    }
    return {
      username: process.env.USERNAME || process.env.USER || 'runner',
      uid: -1,
      gid: -1,
      shell: null,
      homedir: os.homedir(),
    };
  }
};
