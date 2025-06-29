import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Message, Session } from './index'
import {
  TABLE_NAMES,
  type LLMModelTypeEnum,
  type LLMProviderEnum,
  type LLMStatusEnum,
} from '../types'

@Entity({ name: TABLE_NAMES.LLM })
export class LLM {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  name: string

  @Column({ type: 'text' })
  status: `${LLMStatusEnum}`

  @Column({ type: 'text' })
  provider: `${LLMProviderEnum}`

  @Column({ type: 'text' })
  model_type: `${LLMModelTypeEnum}`

  @Column({ type: 'boolean', nullable: true })
  function_calling?: boolean

  @Column({ type: 'text', nullable: true })
  metadata?: string

  @Column({ type: 'text', nullable: true })
  connection_info?: string

  @Column({ type: 'json', nullable: true })
  parameters?: Record<string, unknown>

  @Column({ type: 'json', nullable: true })
  options?: Record<string, unknown>

  @Column({ type: 'json', nullable: true })
  encrypted?: Record<string, unknown>

  @CreateDateColumn()
  created_at?: Date

  @UpdateDateColumn()
  updated_at?: Date

  @OneToMany(() => Message, (message: Message) => message.llm)
  messages?: Message[]

  @Column('uuid')
  session_id: string
  @ManyToOne(() => Session, (entity: Session) => entity.llms, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'session_id' })
  session?: Session
}
