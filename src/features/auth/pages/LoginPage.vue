<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <img src="/logo.png" alt="Semanur HUB" class="logo-icon" />
        <h1>SEMANUR<span> HUB</span></h1>
      </div>
      <p class="login-subtitle">Tu plataforma inteligente de gestión de taller y flota</p>

      <form class="login-form" @submit.prevent="onSubmit">
        <div class="input-group">
          <label>CORREO</label>
          <input v-model="email" class="input" type="email" required />
        </div>

        <div class="input-group">
          <label>CONTRASEÑA</label>
          <div style="position: relative; display: flex; align-items: center;">
            <input v-model="password" class="input" :type="showPassword ? 'text' : 'password'" required style="width: 100%; padding-right: 40px;" />
            <button type="button" @click="showPassword = !showPassword" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: #888; display: flex; align-items: center; justify-content: center; padding: 0;">
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>

        <p v-if="auth.error" class="login-error show">{{ auth.error }}</p>

        <button class="btn btn-primary" type="submit" :disabled="auth.loading">
          {{ auth.loading ? 'VALIDANDO...' : 'INICIAR SESION' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../shared/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);

async function onSubmit() {
  const success = await auth.login({ email: email.value, password: password.value });
  if (success) {
    router.replace('/');
  }
}
</script>

<style scoped>
@media (max-width: 480px) {
  .login-card {
    width: 90%;
    padding: 24px 20px;
  }
}
</style>
