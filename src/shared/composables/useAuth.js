import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, ensureAnonymousAuth } from '../config/supabase.js'

/**
 * Supabase Auth composable for managing user authentication state
 * 
 * @returns {Object} Authentication state and functions
 * @returns {Ref} user - Current authenticated user
 * @returns {ComputedRef} isAuthenticated - Whether user is logged in
 * @returns {Ref} loading - Loading state during auth initialization
 * @returns {Function} signInAnon - Sign in anonymously
 */
export function useAuth() {
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)
  const loading = ref(true)
  let unsubscribe = null

  onMounted(() => {
    try {
      unsubscribe = supabase.auth.onAuthStateChange((event, session) => {
        user.value = session?.user || null
        loading.value = false
        
        if (!user.value && !loading.value) {
          signInAnon().catch(err => {
            console.warn('[useAuth] Auto sign-in failed:', err)
          })
        }
      })

      // 初始化时检查会话
      supabase.auth.getSession().then(({ data: { session } }) => {
        user.value = session?.user || null
        loading.value = false
        
        if (!user.value) {
          signInAnon().catch(err => {
            console.warn('[useAuth] Initial sign-in failed:', err)
          })
        }
      })
    } catch (error) {
      console.warn('[useAuth] Auth initialization failed:', error)
      loading.value = false
    }
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  /**
   * Sign in anonymously
   * @returns {Promise<User>} Supabase user object
   */
  const signInAnon = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        throw error
      }
      return data.user
    } catch (error) {
      console.error('Anonymous sign-in failed:', error)
      throw error
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    signInAnon
  }
}

export default useAuth
