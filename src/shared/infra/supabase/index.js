import { SupabaseIdentityStore } from './SupabaseIdentityStore.js'
import { SupabaseInteractionStore } from './SupabaseInteractionStore.js'
import { SupabaseLeaderboardStore } from './SupabaseLeaderboardStore.js'
import { SupabaseMediaStore } from './SupabaseMediaStore.js'
import { SupabasePracticeStore } from './SupabasePracticeStore.js'
import { SupabaseWorksStore } from './SupabaseWorksStore.js'

export function createSupabaseInfra() {
  const mediaStore = new SupabaseMediaStore()
  
  return {
    identity: new SupabaseIdentityStore(),
    practice: new SupabasePracticeStore({ mediaStore }),
    works: new SupabaseWorksStore(),
    interaction: new SupabaseInteractionStore(),
    leaderboard: new SupabaseLeaderboardStore(),
    media: mediaStore,
  }
}
