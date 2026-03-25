import { LEARN_AVATAR_PRESETS, avatarPresetById, normalizeLearnProfile } from '../shared/infra/profileUtils.js'

describe('learn avatar presets', () => {
  it('keeps a rich built-in preset library', () => {
    expect(LEARN_AVATAR_PRESETS.length).toBeGreaterThanOrEqual(8)
    for (const preset of LEARN_AVATAR_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.label).toBeTruthy()
      expect(preset.bgStart).toBeTruthy()
      expect(preset.bgEnd).toBeTruthy()
      expect(preset.ornamentType).toBeTruthy()
      expect(preset.pattern).toBeTruthy()
    }
  })

  it('maps legacy preset ids to new built-in presets', () => {
    expect(avatarPresetById('preset:jadeite').id).toBe('jade')
    expect(avatarPresetById('preset:porcelain-blue').id).toBe('porcelain')
  })

  it('normalizes old profiles without breaking avatar storage shape', () => {
    const profile = normalizeLearnProfile({
      displayName: '戏友',
      avatar: 'preset:jadeite'
    })

    expect(profile.avatar).toBe('preset:jade')
  })
})
