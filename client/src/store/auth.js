import router from "@/router/index.js";
import userAPI from "@/api/user.js";

const state = {
  user: {
    id: "",
    name: "",
    email: "",
  },
};

const mutations = {
  SET_USER(state, user) {
    state.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  },
  LOGOUT() {
    localStorage.removeItem("token");
    location.replace("/login");
    return;
  },
};

const actions = {
  async checkUser({ commit }) {
    try {
      const { data: user } = await userAPI.authorize();
      commit("SET_USER", user);

      if (location.pathname === "/" || location.pathname === "/login") {
        router.replace("/today").catch(() => {});
        return;
      } else {
        router.replace(location.pathname).catch(() => {});
        return;
      }
    } catch (err) {
      alert("로그인에 실패했습니다.");
      router.replace("/login").catch(() => {});
      return;
    }
  },

  logout({ commit }) {
    commit("LOGOUT");
  },
};

export default {
  state,
  actions,
  mutations,
};
