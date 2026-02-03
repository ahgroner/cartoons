export type Character = {
  name: string
  character_id: string
  date_created: string
  color: string
  publisher: string
  age: number | null
  goodness: number
  tags: string[]
  asset_path: string
  sprite_width: number
  sprite_height: number
  idle_frames: number
  walk_frames: number
}
