const { normalizeEmail, validatePassword, validateMember, validateStudentAccess, RESET_MESSAGE } = require('./account-contract.cjs');
function requireProfile(profile) {
  if (!profile?.active || !['admin', 'teacher', 'student'].includes(profile.role)
    || (profile.role === 'student' && !/^[A-Za-z0-9_-]{1,128}$/.test(profile.studentId || ''))) throw new Error('Seu perfil não está liberado. Peça ao administrador para conferir seu cadastro.');
  return profile;
}
function createAuthFlow(adapter) {
  async function provision(data, password, save) {
    let identity;
    try {
      identity = await adapter.createCredentials(data.email, password);
      await save(identity.uid, { ...data, active: true });
      // A delivery failure must not undo an account already linked in Firestore.
      let verificationSent = false;
      try { await adapter.sendVerification(identity); verificationSent = true; } catch {}
      return { id: identity.uid, ...data, active: true, verificationSent };
    } catch (error) {
      if (identity) {
        try { await adapter.deleteCredentials(identity); }
        catch { throw new Error('O cadastro não foi concluído. Confira o usuário no Authentication e o perfil no Firestore antes de tentar novamente.'); }
      }
      throw error;
    } finally { await adapter.finishProvisioning().catch(() => {}); }
  }
  async function administrator() {
    const profile = requireProfile(await adapter.currentProfile());
    if (profile.role !== 'admin') throw new Error('Apenas o administrador pode gerenciar a equipe.');
    return profile;
  }
  return {
    async login(emailInput, password) {
      const email = normalizeEmail(emailInput);
      if (!password) throw new Error('Informe sua senha.');
      try {
        const identity = await adapter.signInPassword(email, password);
        const profile = requireProfile(await adapter.readProfile(identity.uid));
        if (profile.role === 'student') {
          const student = await adapter.readStudent(profile.studentId);
          if (!student || student.deleting || student.authUid !== identity.uid) throw new Error('Seu cadastro de aluno está indisponível. Entre em contato com seu professor.');
        }
        return { ...profile, emailVerified: identity.emailVerified === true };
      } catch (error) { await adapter.signOut(); throw error; }
    },
    async createMember(input) {
      await administrator();
      const data = validateMember(input);
      validatePassword(input.password, input.confirmation);
      return provision(data, input.password, adapter.saveProfile);
    },
    async createStudentAccess(input) {
      const actor = requireProfile(await adapter.currentProfile());
      if (!['admin', 'teacher'].includes(actor.role)) throw new Error('Apenas a equipe pode liberar o acesso de alunos.');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.studentId || '')) throw new Error('Identificador de aluno inválido.');
      const { email } = validateStudentAccess(input);
      const student = await adapter.readStudent(input.studentId);
      if (!student || student.deleting || (actor.role !== 'admin' && student.teacherId !== actor.id)) throw new Error('Aluno não encontrado ou acesso indisponível.');
      if (student.authUid) throw new Error('Este aluno já possui acesso. Ele pode recuperar a senha na tela de login.');
      return provision({ name: student.name, email, role: 'student', activity: null, studentId: input.studentId }, input.password, adapter.saveStudentProfile);
    },
    async listMembers() { await administrator(); return (await adapter.listProfiles()).filter(profile => profile.role !== 'student'); },
    async requestEmailVerification() {
      requireProfile(await adapter.currentProfile());
      const identity = adapter.currentIdentity();
      if (!identity) throw new Error('Entre novamente para continuar.');
      await adapter.reloadIdentity(identity);
      if (!identity.emailVerified) await adapter.sendVerification(identity);
      return { emailVerified: identity.emailVerified === true };
    },
    async checkEmailVerification() {
      requireProfile(await adapter.currentProfile());
      const identity = adapter.currentIdentity();
      if (!identity) throw new Error('Entre novamente para continuar.');
      await adapter.reloadIdentity(identity);
      return { emailVerified: identity.emailVerified === true };
    },
    async requestPasswordReset(emailInput) {
      const email = normalizeEmail(emailInput);
      try { await adapter.sendReset(email); }
      catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
      return { message: RESET_MESSAGE };
    },
    async changePassword(currentPassword, password, confirmation) {
      requireProfile(await adapter.currentProfile());
      validatePassword(password, confirmation);
      if (!currentPassword) throw new Error('Informe sua senha atual.');
      await adapter.reauthenticate(currentPassword);
      await adapter.updatePassword(password);
    },
    logout: adapter.signOut,
  };
}
module.exports = { createAuthFlow };
