import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Prompt, Session } from './index'
import { TABLE_NAMES, type AppEntityNames, type PromptVariableTypeEnum } from '../types'

@Entity({ name: TABLE_NAMES.PromptVariable })
export class PromptVariable {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  name: string

  @Column({ type: 'text' })
  type: `${PromptVariableTypeEnum}`

  @Column({ type: 'text', nullable: true })
  value: string

  @Column({ type: 'text' })
  map_field: string

  @Column({ type: 'text', nullable: true })
  map_key: string

  @Column({ type: 'text' })
  map_id: string

  @Column({ type: 'text' })
  map_type: `${AppEntityNames}`

  @Column({ type: 'text', nullable: true })
  metadata?: string

  @CreateDateColumn()
  created_at?: Date

  @UpdateDateColumn()
  updated_at?: Date

  @Column('uuid', { nullable: true })
  prompt_id: string
  @ManyToOne(() => Prompt, (llm: Prompt) => llm.variables, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'prompt_id' })
  prompt?: Prompt

  @Column('uuid')
  session_id: string
  @ManyToOne(() => Session, (entity: Session) => entity.prompt_variables, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'session_id' })
  session?: Session
}
