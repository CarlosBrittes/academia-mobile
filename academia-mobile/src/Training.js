import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Field } from './ui';
import { colors as c, formHeading } from './theme';
import useFileAsset from './useFileAsset';
const { FILE_LIMITS } = require('./file-contract.cjs');
const { formatTimeInput } = require('./domain.cjs');
let sequence = 0;
const id = () => `${Date.now()}-item-${++sequence}`;
export const blankExercise = () => ({ id: id(), name: '', sets: '3', reps: '12', load: '', rest: '60 s', note: '', video: null });
export const blankMeal = () => ({ id: id(), name: '', time: '', food: '', alternatives: '' });
function Action({ children, onPress, disabled }) { return <Button secondary compact title={children} onPress={onPress} disabled={disabled} />; }
function Input({ label, value, onChange, multiline, ...props }) { return <Field label={label} value={value} onChangeText={onChange} multiline={multiline} style={s.field} {...props} />; }
function Player({ uri }) {
  const player = useVideoPlayer(uri);
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  return <View style={s.player}>{status === 'loading' && <Text style={s.hint}>Carregando vídeo…</Text>}<VideoView player={player} style={{width:'100%',aspectRatio:16/9}} nativeControls contentFit="contain" />{(status === 'error' || error) && <Text accessibilityRole="alert" style={s.error}>Não foi possível reproduzir este arquivo. Tente outro vídeo MP4 (H.264).</Text>}</View>;
}
function VideoPreview({ video }) {
  const [open,setOpen] = useState(false);
  const { uri, loading, error } = useFileAsset(video, open);
  if (!video.uri && !video.fileId) return <Text style={s.hint}>{video.name}: o nome está salvo, mas este anexo antigo não foi enviado ao Firebase.</Text>;
  return <View><Action onPress={() => setOpen(!open)}>{open ? 'Fechar vídeo' : '▶ Ver demonstração'}</Action>{open && <>{loading && <Text style={s.hint}>Carregando vídeo salvo…</Text>}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!uri && <Player key={uri} uri={uri}/>}</>}</View>;
}
export function TrainingEditor({ exercises, onChange }) {
  const [error,setError] = useState('');
  const [picking,setPicking] = useState(false);
  const update = (key,patch) => onChange(exercises.map(e => e.id === key ? {...e,...patch} : e));
  async function pick(key) {
    setError('');setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({type:'video/*',copyToCacheDirectory:true,multiple:false});
      if (!result.canceled) {
        const asset = result.assets[0];
        if ((asset.size || 0) > FILE_LIMITS.video) throw new Error('Escolha um vídeo de até 10 MB.');
        update(key,{video:{uri:asset.uri,name:asset.name,size:asset.size || 0,mimeType:asset.mimeType || 'video/mp4'}});
      }
    } catch(e) {setError(e.message || 'Não foi possível selecionar o vídeo.');} finally {setPicking(false);}
  }
  return <View>{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {exercises.map((e,i) => <View style={s.editor} key={e.id}><View style={s.row}><Text style={s.number}>{String(i+1).padStart(2,'0')}</Text><Text style={s.title}>Exercício</Text></View>
      <Input label="Nome do exercício" value={e.name} onChange={name=>update(e.id,{name})} placeholder="Ex.: Agachamento livre" />
      <View style={s.grid}><Input label="Séries" value={e.sets} onChange={sets=>update(e.id,{sets})} keyboardType="number-pad"/><Input label="Repetições" value={e.reps} onChange={reps=>update(e.id,{reps})} placeholder="12 ou 10–12"/></View>
      <View style={s.grid}><Input label="Carga" value={e.load} onChange={load=>update(e.id,{load})} placeholder="Ex.: 20 kg"/><Input label="Descanso" value={e.rest} onChange={rest=>update(e.id,{rest})} placeholder="Ex.: 60 s"/></View>
      <Input label="Dica de execução (opcional)" value={e.note} onChange={note=>update(e.id,{note})} placeholder="Uma orientação para este exercício" />
      <Action disabled={picking} onPress={()=>pick(e.id)}>{e.video ? 'Trocar vídeo' : '＋ Anexar vídeo de exemplo'}</Action>
      {e.video && <><Text style={s.hint}>{e.video.name}</Text><VideoPreview video={e.video}/><Action onPress={()=>update(e.id,{video:null})}>Remover vídeo</Action></>}
      <View style={s.row}>{i>0 && <Action onPress={()=>{const list=[...exercises];[list[i-1],list[i]]=[list[i],list[i-1]];onChange(list);}}>↑ Mover acima</Action>}<Action onPress={()=>onChange(exercises.filter(x=>x.id!==e.id))}>Remover exercício</Action></View>
    </View>)}<Action onPress={()=>onChange([...exercises,blankExercise()])}>＋ Adicionar exercício</Action><Text style={s.hint}>Vídeo opcional, até 10 MB. Prefira MP4 (H.264). O vídeo e o histórico serão salvos no Firebase.</Text></View>;
}
export function MealEditor({ meals, onChange }) {
  const update=(key,patch)=>onChange(meals.map(m=>m.id===key?{...m,...patch}:m));
  return <View><Text style={s.intro}>Organize o dia, refeição por refeição</Text><Text style={s.hint}>Registre o plano orientado pela nutricionista.</Text>{meals.map((m,i)=><View key={m.id} style={s.editor}><View style={s.row}><Text style={s.number}>{String(i+1).padStart(2,'0')}</Text><Text style={s.title}>Refeição</Text></View><Input label="Nome da refeição" value={m.name} onChange={name=>update(m.id,{name})} placeholder="Ex.: Café da manhã"/><Input label="Horário (opcional)" value={m.time} onChange={time=>update(m.id,{time:formatTimeInput(time,m.time)})} keyboardType="number-pad" inputMode="numeric" placeholder="07:30" maxLength={5} hint="Digite somente os números. O separador aparece automaticamente."/><Input label="Alimentos e quantidades" value={m.food} onChange={food=>update(m.id,{food})} multiline placeholder="Descreva as porções indicadas pela nutricionista"/><Input label="Substituições (opcional)" value={m.alternatives} onChange={alternatives=>update(m.id,{alternatives})} multiline placeholder="Alternativas previstas no plano"/><View style={s.row}>{i>0 && <Action onPress={()=>{const list=[...meals];[list[i-1],list[i]]=[list[i],list[i-1]];onChange(list);}}>↑ Mover acima</Action>}<Action onPress={()=>onChange(meals.filter(x=>x.id!==m.id))}>Remover refeição</Action></View></View>)}<Action onPress={()=>onChange([...meals,blankMeal()])}>＋ Adicionar refeição</Action></View>;
}
function ExerciseCard({ exercise:e, index }) {
  const [expanded,setExpanded]=useState(false);
  return <View style={s.exercise}><Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={s.row}><Text style={s.number}>{String(index+1).padStart(2,'0')}</Text><View style={{flex:1}}><Text style={s.title}>{e.name}</Text><Text style={s.hint}>{e.sets} séries × {e.reps} repetições</Text></View><Text style={s.actionText}>{expanded?'−':'＋'}</Text></Pressable><View style={s.badges}><Text style={s.badge}>{e.load || 'Carga orientada'}</Text><Text style={s.badge}>Pausa: {e.rest || 'A combinar'}</Text>{e.video && <Text style={s.badge}>▶ Vídeo</Text>}</View>{expanded && <>{!!e.note && <Text style={s.description}>{e.note}</Text>}{e.video ? <VideoPreview video={e.video}/> : <Text style={s.hint}>Sem vídeo anexado a este exercício.</Text>}</>}</View>;
}
export function RecordDetails({ record }) {
  return <View>{(record.exercises || []).map((e,i)=><ExerciseCard key={e.id} exercise={e} index={i}/>)}{(record.meals || []).map(m=><View key={m.id} style={s.meal}><Text style={s.time}>{m.time || 'NO SEU HORÁRIO'}</Text><Text style={s.title}>{m.name}</Text><Text style={s.description}>{m.food}</Text>{!!m.alternatives && <View style={s.alternatives}><Text style={s.label}>PODE SUBSTITUIR POR</Text><Text style={s.description}>{m.alternatives}</Text></View>}</View>)}</View>;
}
const s=StyleSheet.create({
  intro:{fontSize:19,fontWeight:'700',color:c.text,marginVertical:10},hint:{fontSize:12,color:c.muted,lineHeight:19,marginVertical:5},editor:{backgroundColor:'#141d17',borderWidth:1,borderColor:c.border,borderRadius:20,padding:18,marginVertical:12},row:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},number:{fontSize:18,fontWeight:'800',color:c.lime,backgroundColor:'#c7f76b15',padding:10,borderRadius:12},title:formHeading,field:{flexGrow:1,flexShrink:1,minWidth:0,marginVertical:8},label:{fontSize:10,fontWeight:'700',color:c.green,marginBottom:7,letterSpacing:1},grid:{flexDirection:'row',gap:12},actionText:{color:c.lime,fontSize:13,fontWeight:'700'},error:{color:c.danger,padding:12,backgroundColor:'#3b2522',borderRadius:10},player:{marginVertical:10,backgroundColor:'#080d09',borderRadius:12,overflow:'hidden'},exercise:{backgroundColor:'#141d17',borderWidth:1,borderColor:c.border,borderRadius:16,padding:16,marginTop:12},badges:{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:12},badge:{backgroundColor:c.elevated,paddingVertical:6,paddingHorizontal:10,borderRadius:7,color:'#bdcdb8',fontSize:11},description:{fontSize:14,color:'#c5d0c3',lineHeight:23,marginTop:8},meal:{borderLeftWidth:3,borderLeftColor:c.green,backgroundColor:'#14271e',padding:18,marginTop:14,borderRadius:12},time:{color:c.green,fontSize:11,fontWeight:'800',letterSpacing:1,marginBottom:8},alternatives:{marginTop:12,paddingTop:12,borderTopWidth:1,borderTopColor:'#2b4233'}
});


